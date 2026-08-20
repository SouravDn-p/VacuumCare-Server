import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { RequestStatus, UserRole } from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { adminLocalTodayRange } from './admin-date-range';
import {
  AdminCustomerQueryDto,
  AdminTechnicianQueryDto,
  AdminUpdateCustomerDto,
  AdminUpdateTechnicianDto,
} from './dto/admin-operations.dto';

type SafeUser = Omit<Prisma.UserGetPayload<object>, 'passwordHash'>;
type TechnicianViewRow = SafeUser & {
  technician: Prisma.TechnicianProfileGetPayload<object> | null;
  _count: { assignedRequests: number };
  assignedRequests: { id: string }[];
};
type CustomerViewRow = SafeUser & {
  _count: { customerRequests: number; orders: number };
};

@Injectable()
export class AdminPeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async technicians(query: AdminTechnicianQueryDto) {
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
      where.OR = this.personSearch(query.search, true);
    }
    const today = adminLocalTodayRange(query.timezone);
    const jobsToday = {
      scheduledStart: { gte: today.start, lt: today.end },
      status: {
        in: [RequestStatus.SCHEDULED, RequestStatus.IN_PROGRESS],
      },
    };
    const [rows, total] = await this.prisma.$transaction([
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
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.technicianView(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async technician(id: string, timezone?: string) {
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

  async updateTechnician(id: string, dto: AdminUpdateTechnicianDto) {
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
    return this.technician(id);
  }

  async customers(query: AdminCustomerQueryDto) {
    const where: Prisma.UserWhereInput = { role: UserRole.CUSTOMER };
    if (query.search) where.OR = this.personSearch(query.search, false);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        omit: { passwordHash: true },
        include: {
          _count: { select: { customerRequests: true, orders: true } },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.customerView(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async customer(id: string) {
    const row = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      omit: { passwordHash: true },
      include: {
        addresses: { orderBy: [{ isPrimary: 'desc' }, { city: 'asc' }] },
        _count: { select: { customerRequests: true, orders: true } },
      },
    });
    if (!row) throw new NotFoundException('Customer not found');
    return this.customerView(row);
  }

  async updateCustomer(id: string, dto: AdminUpdateCustomerDto) {
    const exists = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Customer not found');
    await this.prisma.user.update({ where: { id }, data: dto });
    return this.customer(id);
  }

  private personSearch(
    search: string,
    technician: boolean,
  ): Prisma.UserWhereInput[] {
    const fields: Prisma.UserWhereInput[] = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
    if (technician) {
      fields.push(
        {
          technician: {
            serviceArea: { contains: search, mode: 'insensitive' },
          },
        },
        {
          technician: { employeeId: { contains: search, mode: 'insensitive' } },
        },
      );
    } else {
      fields.push({
        addresses: {
          some: {
            OR: [
              { line1: { contains: search, mode: 'insensitive' } },
              { apartment: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { state: { contains: search, mode: 'insensitive' } },
              { zipCode: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      });
    }
    return fields;
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

  private customerView<T extends CustomerViewRow>(row: T) {
    const { _count, ...user } = row;
    return {
      ...user,
      requestCount: _count.customerRequests,
      orderCount: _count.orders,
    };
  }
}
