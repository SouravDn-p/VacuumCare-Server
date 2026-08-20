import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { RequestStatus, UserRole } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../database/prisma.service';
import { adminLocalTodayRange } from '../common/admin-date-range';
import { adminPage, adminSkip } from '../common/admin-pagination';
import {
  AdminTechnicianQueryDto,
  AdminUpdateTechnicianDto,
} from './dto/technicians.dto';

type SafeUser = Omit<Prisma.UserGetPayload<object>, 'passwordHash'>;
type TechnicianViewRow = SafeUser & {
  technician: Prisma.TechnicianProfileGetPayload<object> | null;
  _count: { assignedRequests: number };
  assignedRequests: { id: string }[];
};

@Injectable()
export class AdminTechniciansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminTechnicianQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: UserRole.TECHNICIAN,
      technician: {
        is: {
          verificationStatus: query.verificationStatus,
          isAvailable: query.isAvailable,
        },
      },
    };
    if (query.search) {
      where.OR = this.personSearch(query.search);
    }
    const today = adminLocalTodayRange(query.timezone);
    const jobsToday = {
      scheduledStart: { gte: today.start, lt: today.end },
      status: {
        in: [RequestStatus.SCHEDULED, RequestStatus.IN_PROGRESS],
      },
    };
    const result = await adminPage(
      this.prisma,
      this.prisma.user.findMany({
        where,
        omit: { passwordHash: true },
        include: {
          technician: true,
          _count: {
            select: {
              assignedRequests: {
                where: jobsToday,
              },
            },
          },
          assignedRequests: {
            where: {
              status: RequestStatus.REPORT_SUBMITTED,
              report: { is: { customerConfirmedAt: null } },
            },
            select: { id: true },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: adminSkip(query),
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
      query,
    );
    return {
      ...result,
      items: result.items.map((row) => this.technicianView(row)),
    };
  }

  async get(id: string, timezone?: string) {
    const today = adminLocalTodayRange(timezone);
    const row = await this.prisma.user.findFirst({
      where: { id, role: UserRole.TECHNICIAN },
      omit: { passwordHash: true },
      include: {
        technician: true,
        _count: {
          select: {
            assignedRequests: {
              where: {
                scheduledStart: { gte: today.start, lt: today.end },
                status: {
                  in: [RequestStatus.SCHEDULED, RequestStatus.IN_PROGRESS],
                },
              },
            },
          },
        },
        assignedRequests: {
          where: {
            status: RequestStatus.REPORT_SUBMITTED,
            report: { is: { customerConfirmedAt: null } },
          },
          select: { id: true },
        },
      },
    });
    if (!row?.technician) throw new NotFoundException('Technician not found');
    return this.technicianView(row);
  }

  async update(id: string, dto: AdminUpdateTechnicianDto) {
    const exists = await this.prisma.user.findFirst({
      where: { id, role: UserRole.TECHNICIAN, technician: { isNot: null } },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Technician not found');

    const {
      serviceArea,
      skills,
      licenseNumber,
      yearsExperience,
      bio,
      isAvailable,
      ...userData
    } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: userData }),
      this.prisma.technicianProfile.update({
        where: { userId: id },
        data: {
          serviceArea,
          skills,
          licenseNumber,
          yearsExperience,
          bio,
          isAvailable,
        },
      }),
    ]);
    return this.get(id);
  }

  private personSearch(search: string): Prisma.UserWhereInput[] {
    return [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      {
        technician: {
          serviceArea: { contains: search, mode: 'insensitive' },
        },
      },
      {
        technician: { employeeId: { contains: search, mode: 'insensitive' } },
      },
    ];
  }

  private technicianView(row: TechnicianViewRow) {
    if (!row.technician) throw new NotFoundException('Technician not found');
    const { technician, _count, assignedRequests, ...user } = row;
    return {
      ...user,
      ...technician,
      id: user.id,
      profileId: technician.id,
      rating: Number(technician.rating),
      jobsToday: _count.assignedRequests,
      reportsAwaitingReview: assignedRequests.length,
    };
  }
}
