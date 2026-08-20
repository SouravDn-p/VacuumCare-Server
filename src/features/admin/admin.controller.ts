import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  OrderStatus,
  PaymentStatus,
  QuoteCounterofferStatus,
  RequestStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import type { AuthUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { PrismaService } from '../../database/prisma.service';
import { DecideQuoteCounterofferDto } from '../service-requests/dto/quote-counteroffer.dto';
import { QuoteCounterofferResponseDto } from '../service-requests/dto/service-request-response.dto';
import { QuoteCounterofferService } from '../service-requests/quote-counteroffer.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminPaginationQueryDto } from './dto/admin-query.dto';
import {
  AdminDashboardDateQueryDto,
  AdminDashboardDistributionQueryDto,
  AdminDashboardLimitQueryDto,
  AdminDashboardRangeQueryDto,
  AdminDashboardScheduleQueryDto,
  BroadcastNotificationDto,
} from './dto/admin.dto';
import {
  AdminDashboardResponseDto,
  AdminDashboardSummaryResponseDto,
  AdminPendingCounterofferQueueResponseDto,
  AdminRecentOrderResponseDto,
  AdminRecentServiceRequestResponseDto,
  AdminRevenueSeriesResponseDto,
  AdminScheduleItemResponseDto,
  AdminServiceDistributionResponseDto,
  BroadcastNotificationResponseDto,
} from './dto/admin-response.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: AdminDashboardService,
    private readonly counteroffers: QuoteCounterofferService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Get aggregate operations and financial dashboard metrics (admin only)',
  })
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async dashboard(@CurrentUser() user: AuthUser) {
    this.admin(user);
    const [
      customers,
      technicians,
      techniciansPendingVerification,
      activeServiceRequests,
      pendingOrders,
      products,
      paymentSummary,
      completedPayments,
      requestGroups,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.TECHNICIAN } }),
      this.prisma.technicianProfile.count({
        where: { verificationStatus: 'PENDING_VERIFICATION' },
      }),
      this.prisma.serviceRequest.count({
        where: {
          status: { notIn: [RequestStatus.COMPLETED, RequestStatus.CANCELLED] },
        },
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PAYMENT_PENDING,
              OrderStatus.PAID,
              OrderStatus.PROCESSING,
            ],
          },
        },
      }),
      this.prisma.product.count(),
      this.prisma.payment.aggregate({
        where: {
          status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.CAPTURED] },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: {
          status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.CAPTURED] },
        },
      }),
      this.prisma.serviceRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);
    return {
      customers,
      technicians,
      techniciansPendingVerification,
      activeServiceRequests,
      pendingOrders,
      products,
      capturedRevenue: Number(paymentSummary._sum.amount ?? 0),
      completedPayments,
      requestStatusCounts: Object.fromEntries(
        requestGroups.map((group) => [group.status, group._count._all]),
      ),
    };
  }

  @Get('dashboard/summary')
  @ApiOperation({
    summary: 'Get the independent KPI cards for the admin dashboard',
  })
  @ApiOkResponse({ type: AdminDashboardSummaryResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  dashboardSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardDateQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.summary(query);
  }

  @Get('dashboard/recent-service-requests')
  @ApiOperation({ summary: 'Get recent service requests for the dashboard' })
  @ApiOkResponse({
    type: AdminRecentServiceRequestResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  recentServiceRequests(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardLimitQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.recentServiceRequests(query);
  }

  @Get('dashboard/schedule')
  @ApiOperation({ summary: 'Get the admin schedule for one local date' })
  @ApiOkResponse({ type: AdminScheduleItemResponseDto, isArray: true })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  schedule(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardScheduleQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.schedule(query);
  }

  @Get('dashboard/revenue')
  @ApiOperation({
    summary: 'Get monthly net service revenue for a local date range',
  })
  @ApiOkResponse({ type: AdminRevenueSeriesResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  revenue(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardRangeQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.revenue(query);
  }

  @Get('dashboard/service-distribution')
  @ApiOperation({
    summary: 'Get top service issues and an Others bucket',
  })
  @ApiOkResponse({ type: AdminServiceDistributionResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  serviceDistribution(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardDistributionQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.serviceDistribution(query);
  }

  @Get('dashboard/recent-orders')
  @ApiOperation({ summary: 'Get recent store orders for the dashboard' })
  @ApiOkResponse({ type: AdminRecentOrderResponseDto, isArray: true })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  recentOrders(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminDashboardLimitQueryDto,
  ) {
    this.admin(user);
    return this.dashboardService.recentOrders(query);
  }

  @Get('quote-counteroffers/pending')
  @ApiOperation({
    summary: 'List pending customer quote counteroffers (admin only)',
  })
  @ApiOkResponse({ type: AdminPendingCounterofferQueueResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  pendingCounteroffers(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminPaginationQueryDto,
  ) {
    this.admin(user);
    return this.counteroffers.pending(query.page, query.pageSize);
  }

  @Post('quote-counteroffers/:id/approve')
  @ApiOperation({
    summary: 'Approve a pending counteroffer without accepting the quote',
    description:
      'Sets the negotiated quote total only. The customer must still accept terms through the quotation acceptance endpoint; Stripe is not called.',
  })
  @ApiParam({ name: 'id', description: 'Quote counteroffer ID' })
  @ApiCreatedResponse({ type: QuoteCounterofferResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  approveCounteroffer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideQuoteCounterofferDto,
  ) {
    return this.counteroffers.decide(
      user,
      id,
      QuoteCounterofferStatus.APPROVED,
      dto,
    );
  }

  @Post('quote-counteroffers/:id/reject')
  @ApiOperation({ summary: 'Reject a pending quote counteroffer (admin only)' })
  @ApiParam({ name: 'id', description: 'Quote counteroffer ID' })
  @ApiCreatedResponse({ type: QuoteCounterofferResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  rejectCounteroffer(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DecideQuoteCounterofferDto,
  ) {
    return this.counteroffers.decide(
      user,
      id,
      QuoteCounterofferStatus.REJECTED,
      dto,
    );
  }

  @Post('notifications/broadcast')
  @ApiOperation({
    summary: 'Broadcast an in-app notification to selected roles (admin only)',
  })
  @ApiCreatedResponse({ type: BroadcastNotificationResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async broadcast(
    @CurrentUser() user: AuthUser,
    @Body() dto: BroadcastNotificationDto,
  ) {
    this.admin(user);
    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(dto.roles?.length ? { role: { in: dto.roles } } : {}),
      },
      select: { id: true },
    });
    if (recipients.length) {
      await this.prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.id,
          title: dto.title,
          body: dto.body,
        })),
      });
    }
    return { recipients: recipients.length };
  }

  private admin(user: AuthUser) {
    if (user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Only administrators can use this action');
  }
}
