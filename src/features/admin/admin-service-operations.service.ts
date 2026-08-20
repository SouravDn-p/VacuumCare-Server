import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  QuoteCounterofferStatus,
  RequestStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { adminUtcRange } from './admin-date-range';
import {
  AdminQuotationQueryDto,
  AdminScheduleQueryDto,
  AdminServiceRequestQueryDto,
} from './dto/admin-operations.dto';

const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

@Injectable()
export class AdminServiceOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async serviceRequests(query: AdminServiceRequestQueryDto) {
    const where: Prisma.ServiceRequestWhereInput = {
      status: query.status,
      customerId: query.customerId,
      technicianId: query.technicianId,
      categoryId: query.categoryId,
      issueId: query.issueId,
    };
    if (query.search) {
      where.OR = [
        { requestNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        {
          customer: { email: { contains: query.search, mode: 'insensitive' } },
        },
        {
          customer: {
            firstName: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          customer: {
            lastName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }
    if (query.from || query.to) {
      if (!query.from || !query.to) {
        throw new BadRequestException('from and to must be provided together');
      }
      const range = adminUtcRange(query.from, query.to, query.timezone);
      where.createdAt = { gte: range.start, lt: range.end };
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceRequest.findMany({
        where,
        select: {
          id: true,
          requestNumber: true,
          status: true,
          description: true,
          customer: { select: personSelect },
          technician: { select: personSelect },
          category: { select: { id: true, name: true } },
          issue: { select: { id: true, name: true } },
          scheduledStart: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async quotations(query: AdminQuotationQueryDto) {
    const where: Prisma.QuotationWhereInput = {
      status: query.status,
      request: query.customerId ? { customerId: query.customerId } : undefined,
    };
    if (query.search) {
      where.OR = [
        { quoteNumber: { contains: query.search, mode: 'insensitive' } },
        {
          request: {
            requestNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          request: {
            customer: {
              email: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          request: {
            customer: {
              firstName: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          request: {
            customer: {
              lastName: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        include: {
          request: {
            select: {
              id: true,
              requestNumber: true,
              status: true,
              customer: { select: personSelect },
            },
          },
          counteroffers: {
            where: { status: QuoteCounterofferStatus.PENDING },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { validUntil: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.quotation.count({ where }),
    ]);
    const items = rows.map(({ request, counteroffers, ...quote }) => ({
      ...quote,
      request: {
        id: request.id,
        requestNumber: request.requestNumber,
        status: request.status,
      },
      customer: request.customer,
      pendingNegotiation: counteroffers[0] ?? null,
    }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  schedule(query: AdminScheduleQueryDto) {
    const range = adminUtcRange(query.from, query.to, query.timezone);
    return this.prisma.serviceRequest.findMany({
      where: {
        scheduledStart: { gte: range.start, lt: range.end },
        technicianId: query.technicianId,
        status: {
          in: query.status?.length
            ? query.status
            : [
                RequestStatus.SCHEDULED,
                RequestStatus.IN_PROGRESS,
                RequestStatus.REPORT_SUBMITTED,
                RequestStatus.COMPLETED,
              ],
        },
      },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        description: true,
        customer: { select: personSelect },
        technician: { select: personSelect },
        category: { select: { id: true, name: true } },
        issue: { select: { id: true, name: true } },
        scheduledStart: true,
        scheduledEnd: true,
        createdAt: true,
        address: {
          select: {
            line1: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: [{ scheduledStart: 'asc' }, { requestNumber: 'asc' }],
    });
  }
}
