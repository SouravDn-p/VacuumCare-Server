import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  MediaKind,
  PaymentStatus,
  QuoteStatus,
  RequestStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import type { AuthUser } from '../../common/auth/auth.types';
import { PrismaService } from '../../database/prisma.service';
import { MediaUploadService } from '../../service/cloudinary/media-upload.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../payments/stripe.service';
import type {
  AssignTechnicianDto,
  CancelRequestDto,
  EquipmentDto,
  MediaDto,
  ReportDto,
  UpdateRequestStatusDto,
} from './dto/service-request.dto';

export const MAX_REQUEST_MEDIA = 10;

export const REQUEST_MEDIA_FOLDER = 'vacuumCare/service-requests';

const CUSTOMER_CANCELLABLE = new Set<RequestStatus>([
  RequestStatus.NEW,
  RequestStatus.UNDER_REVIEW,
  RequestStatus.QUOTE_SENT,
  RequestStatus.ACCEPTED,
  RequestStatus.SCHEDULED,
]);

export const requestDetailInclude = {
  customer: { omit: { passwordHash: true } },
  technician: { omit: { passwordHash: true } },
  category: { include: { issues: true } },
  issue: true,
  address: true,
  media: true,
  quotation: {
    include: {
      counteroffers: {
        include: { statusHistory: { orderBy: { createdAt: 'asc' as const } } },
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
  report: true,
  equipment: { include: { inlets: true } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
} as const;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly stripe: StripeService,
    private readonly mediaUploads: MediaUploadService,
  ) {}

  async withDetails(id: string, user: AuthUser) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        ...requestDetailInclude,
        quotation:
          user.role === UserRole.TECHNICIAN
            ? true
            : requestDetailInclude.quotation,
      },
    });
    if (!request) throw new NotFoundException('Service request not found');
    return request;
  }

  async getAuthorized(user: AuthUser, id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { quotation: true },
    });
    if (!request) throw new NotFoundException('Service request not found');
    if (
      user.role !== UserRole.ADMIN &&
      request.customerId !== user.id &&
      request.technicianId !== user.id
    ) {
      throw new ForbiddenException('You cannot access this service request');
    }
    return request;
  }

  listOwned(user: AuthUser, status?: RequestStatus) {
    return this.prisma.serviceRequest.findMany({
      where: { customerId: user.id, ...(status ? { status } : {}) },
      include: requestDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  listAssigned(user: AuthUser, status?: RequestStatus) {
    return this.prisma.serviceRequest.findMany({
      where: { technicianId: user.id, ...(status ? { status } : {}) },
      include: requestDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async viewAsCustomer(user: AuthUser, id: string) {
    const request = await this.getAuthorized(user, id);
    if (
      user.role === UserRole.CUSTOMER &&
      request.status === RequestStatus.QUOTE_SENT
    ) {
      await this.prisma.quotation.updateMany({
        where: { requestId: id, status: QuoteStatus.SENT },
        data: { status: QuoteStatus.VIEWED, viewedAt: new Date() },
      });
    }
    return this.withDetails(id, user);
  }

  async viewAsTechnician(user: AuthUser, id: string) {
    await this.getAuthorized(user, id);
    return this.withDetails(id, user);
  }

  async setRequestStatus(
    requestId: string,
    status: RequestStatus,
    actorId: string,
    note?: string,
    extra?: { startedAt?: Date },
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: { status, ...extra },
      });
      await tx.serviceRequestStatusHistory.create({
        data: { requestId, status, actorId, note },
      });
    });
  }

  async review(user: AuthUser, id: string, dto: UpdateRequestStatusDto) {
    const request = await this.getAuthorized(user, id);
    if (
      request.status !== RequestStatus.NEW ||
      dto.status !== RequestStatus.UNDER_REVIEW
    )
      throw new BadRequestException(
        'Admin may only advance a new request to under review here',
      );
    await this.setRequestStatus(id, dto.status, user.id, dto.note);
    return this.withDetails(id, user);
  }

  async start(user: AuthUser, id: string, dto: UpdateRequestStatusDto) {
    const request = await this.getAuthorized(user, id);
    if (user.role === UserRole.TECHNICIAN) {
      if (
        request.technicianId !== user.id ||
        request.status !== RequestStatus.SCHEDULED ||
        dto.status !== RequestStatus.IN_PROGRESS
      ) {
        throw new ForbiddenException(
          'Only the assigned technician can start a scheduled request',
        );
      }
    } else {
      throw new ForbiddenException(
        'Use the cancellation route for customer actions',
      );
    }
    await this.setRequestStatus(id, dto.status, user.id, dto.note, {
      startedAt:
        dto.status === RequestStatus.IN_PROGRESS ? new Date() : undefined,
    });
    return this.withDetails(id, user);
  }

  async assign(user: AuthUser, id: string, dto: AssignTechnicianDto) {
    if (user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Only administrators can use this action');
    const [request, technician] = await Promise.all([
      this.prisma.serviceRequest.findUnique({
        where: { id },
        include: { quotation: true },
      }),
      this.prisma.user.findFirst({
        where: {
          id: dto.technicianId,
          role: UserRole.TECHNICIAN,
          isActive: true,
          technician: {
            is: { isAvailable: true, verificationStatus: 'VERIFIED' },
          },
        },
      }),
    ]);
    if (!request) throw new NotFoundException('Service request not found');
    if (!technician)
      throw new NotFoundException('Verified available technician not found');
    if (request.status !== RequestStatus.ACCEPTED || !request.quotation)
      throw new BadRequestException(
        'Only an accepted quotation can be scheduled',
      );
    const authorization = await this.prisma.payment.findFirst({
      where: {
        quotationId: request.quotation.id,
        status: PaymentStatus.AUTHORIZED,
      },
    });
    if (!authorization)
      throw new BadRequestException(
        'A successful Stripe payment authorization is required before scheduling',
      );
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start)
      throw new BadRequestException(
        'scheduledEnd must be after scheduledStart',
      );
    const conflicting = await this.prisma.serviceRequest.findFirst({
      where: {
        id: { not: id },
        technicianId: technician.id,
        status: { in: [RequestStatus.SCHEDULED, RequestStatus.IN_PROGRESS] },
        scheduledStart: { lt: end },
        scheduledEnd: { gt: start },
      },
      select: { id: true },
    });
    if (conflicting)
      throw new ConflictException('Technician already has a conflicting job');
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id },
        data: {
          technicianId: technician.id,
          scheduledStart: start,
          scheduledEnd: end,
          status: RequestStatus.SCHEDULED,
        },
      });
      await tx.serviceRequestStatusHistory.create({
        data: {
          requestId: id,
          status: RequestStatus.SCHEDULED,
          actorId: user.id,
          note: `Assigned to ${technician.firstName} ${technician.lastName}`,
        },
      });
      await tx.conversation.upsert({
        where: { requestId: id },
        create: {
          requestId: id,
          customerId: request.customerId,
          technicianId: technician.id,
        },
        update: { technicianId: technician.id },
      });
      await tx.notification.createMany({
        data: [
          {
            userId: request.customerId,
            title: 'Service appointment scheduled',
            body: 'Your technician and appointment window are confirmed.',
            data: { requestId: id },
          },
          {
            userId: technician.id,
            title: 'New assigned job',
            body: `You have been assigned request ${request.requestNumber}.`,
            data: { requestId: id },
          },
        ],
      });
    });
    return this.withDetails(id, user);
  }

  async cancel(user: AuthUser, id: string, dto: CancelRequestDto) {
    const request = await this.getAuthorized(user, id);
    if (!CUSTOMER_CANCELLABLE.has(request.status))
      throw new BadRequestException('This request can no longer be cancelled');
    if (user.role === UserRole.TECHNICIAN)
      throw new ForbiddenException(
        'Technicians cannot cancel a customer request',
      );
    if (request.status === RequestStatus.CANCELLED)
      throw new BadRequestException('This request is already cancelled');
    // Cancel Stripe's manual authorization before changing the request state.
    // That avoids retaining a card hold for a service the customer has cancelled.
    await this.stripe.voidServiceAuthorizationsForRequest(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceRequest.update({
        where: { id },
        data: {
          status: RequestStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: dto.reason,
        },
      });
      await tx.serviceRequestStatusHistory.create({
        data: {
          requestId: id,
          status: RequestStatus.CANCELLED,
          note: dto.reason,
          actorId: user.id,
        },
      });
      if (request.quotation?.id) {
        await tx.quotation.updateMany({
          where: {
            id: request.quotation.id,
            status: {
              in: [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.ACCEPTED],
            },
          },
          data: { status: QuoteStatus.CANCELLED, cancelledAt: new Date() },
        });
      }
    });
    return this.withDetails(id, user);
  }

  async addMedia(
    user: AuthUser,
    id: string,
    dto: MediaDto,
    file?: Express.Multer.File,
  ) {
    const request = await this.getAuthorized(user, id);
    this.validateMediaRole(user, request.technicianId, dto.kind);
    if (!file && !dto.url)
      throw new BadRequestException(
        'Either a file upload or a url is required',
      );
    if (file) this.mediaUploads.assertMedia([file]);
    else this.validateMime(dto.mimeType);
    const uploaded = file
      ? (await this.mediaUploads.upload([file], REQUEST_MEDIA_FOLDER))[0]
      : undefined;
    const media = await this.prisma.serviceMedia.create({
      data: {
        requestId: id,
        kind: dto.kind,
        url: uploaded?.url ?? dto.url!,
        mimeType: uploaded?.mimeType ?? dto.mimeType,
      },
    });
    await this.notifications.fanOutToActiveAdmins({
      title: 'Service request media added',
      body: `New ${dto.kind.toLowerCase()} media was added to request ${request.requestNumber}.`,
      data: { requestId: id, mediaId: media.id, kind: dto.kind },
    });
    return media;
  }

  async submitReport(user: AuthUser, id: string, dto: ReportDto) {
    const request = await this.getAuthorized(user, id);
    if (user.role !== UserRole.TECHNICIAN || request.technicianId !== user.id)
      throw new ForbiddenException(
        'Only the assigned technician can submit a report',
      );
    if (
      request.status !== RequestStatus.IN_PROGRESS &&
      request.status !== RequestStatus.REPORT_SUBMITTED
    )
      throw new BadRequestException(
        'The request must be in progress before a report is submitted',
      );
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.serviceReport.upsert({
        where: { requestId: id },
        create: {
          requestId: id,
          ...dto,
          partsUsed: dto.partsUsed
            ? (JSON.parse(
                JSON.stringify(dto.partsUsed),
              ) as Prisma.InputJsonValue)
            : undefined,
          arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : undefined,
          departureTime: dto.departureTime
            ? new Date(dto.departureTime)
            : undefined,
        },
        update: {
          ...dto,
          partsUsed: dto.partsUsed
            ? (JSON.parse(
                JSON.stringify(dto.partsUsed),
              ) as Prisma.InputJsonValue)
            : undefined,
          arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : undefined,
          departureTime: dto.departureTime
            ? new Date(dto.departureTime)
            : undefined,
        },
      });
      if (request.status !== RequestStatus.REPORT_SUBMITTED) {
        await tx.serviceRequest.update({
          where: { id },
          data: { status: RequestStatus.REPORT_SUBMITTED },
        });
        await tx.serviceRequestStatusHistory.create({
          data: {
            requestId: id,
            status: RequestStatus.REPORT_SUBMITTED,
            actorId: user.id,
            note: 'Technician report submitted',
          },
        });
        await this.notifications.createForUser(
          request.customerId,
          {
            title: 'Service report submitted',
            body: 'Your technician has submitted the service report for review.',
            data: { requestId: id },
          },
          tx,
        );
        await this.notifications.fanOutToActiveAdmins(
          {
            title: 'Service report submitted',
            body: `A technician submitted the report for request ${request.requestNumber}.`,
            data: { requestId: id },
          },
          tx,
        );
      }
      return report;
    });
  }

  async recordEquipment(user: AuthUser, id: string, dto: EquipmentDto) {
    const request = await this.getAuthorized(user, id);
    if (user.role !== UserRole.TECHNICIAN || request.technicianId !== user.id)
      throw new ForbiddenException(
        'Only the assigned technician can record equipment',
      );
    const existing = await this.prisma.equipment.findFirst({
      where: { requestId: id, unitNumber: dto.unitNumber },
    });
    const data = {
      customerId: request.customerId,
      manufacturer: dto.manufacturer,
      model: dto.model,
      serialNumber: dto.serialNumber,
      location: dto.location,
      condition: dto.condition,
      inlets: dto.inlets ? { deleteMany: {}, create: dto.inlets } : undefined,
    };
    return existing
      ? this.prisma.equipment.update({
          where: { id: existing.id },
          data,
          include: { inlets: true },
        })
      : this.prisma.equipment.create({
          data: { requestId: id, unitNumber: dto.unitNumber, ...data },
          include: { inlets: true },
        });
  }

  private validateMime(mimeType?: string) {
    if (mimeType && !/^(image|video)\/[a-z0-9.+-]+$/i.test(mimeType)) {
      throw new BadRequestException(
        'Only image and video attachments are supported',
      );
    }
  }

  private validateMediaRole(
    user: AuthUser,
    technicianId: string | null,
    kind: MediaKind,
  ) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.CUSTOMER && kind === MediaKind.ISSUE) return;
    if (
      user.role === UserRole.TECHNICIAN &&
      technicianId === user.id &&
      kind !== MediaKind.ISSUE
    )
      return;
    throw new ForbiddenException(
      'This media type is not permitted for your role',
    );
  }
}
