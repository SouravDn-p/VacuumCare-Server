import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { AdminGuard } from './admin.guard';
import { AdminServiceOperationsService } from './admin-service-operations.service';
import {
  AdminQuotationQueryDto,
  AdminScheduleQueryDto,
  AdminServiceRequestQueryDto,
} from './dto/admin-operations.dto';
import {
  AdminOperationsScheduleItemDto,
  AdminQuotationPageDto,
  AdminServiceRequestPageDto,
} from './dto/admin-operations-response.dto';

@ApiTags('Admin Operations')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminServiceOperationsController {
  constructor(private readonly operations: AdminServiceOperationsService) {}

  @Get('service-requests')
  @ApiOperation({
    summary: 'List and filter service requests for administration',
    description:
      'Use existing /service-requests/:id routes for detail and workflow writes such as review, assignment, quotation, status, and reports.',
  })
  @ApiOkResponse({ type: AdminServiceRequestPageDto })
  serviceRequests(@Query() query: AdminServiceRequestQueryDto) {
    return this.operations.serviceRequests(query);
  }

  @Get('quotations')
  @ApiOperation({
    summary: 'List quotations with the current pending negotiation summary',
  })
  @ApiOkResponse({ type: AdminQuotationPageDto })
  quotations(@Query() query: AdminQuotationQueryDto) {
    return this.operations.quotations(query);
  }

  @Get('schedule')
  @ApiOperation({
    summary: 'Get a date-range schedule for day, week, or month views',
  })
  @ApiOkResponse({ type: AdminOperationsScheduleItemDto, isArray: true })
  schedule(@Query() query: AdminScheduleQueryDto) {
    return this.operations.schedule(query);
  }
}
