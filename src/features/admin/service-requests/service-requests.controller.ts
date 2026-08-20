import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../../common/dto/api-response.dto';
import { AdminGuard } from '../admin.guard';
import { AdminServiceRequestQueryDto } from './dto/service-requests.dto';
import { AdminServiceRequestPageDto } from './dto/service-requests-response.dto';
import { AdminServiceRequestsService } from './service-requests.service';

@ApiTags('Admin Service Requests')
@ApiBearerAuth()
@Controller('admin/service-requests')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminServiceRequestsController {
  constructor(private readonly serviceRequests: AdminServiceRequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'List and filter service requests for administration',
    description:
      'Use existing /service-requests/:id routes for detail and workflow writes such as review, assignment, quotation, status, and reports.',
  })
  @ApiOkResponse({ type: AdminServiceRequestPageDto })
  list(@Query() query: AdminServiceRequestQueryDto) {
    return this.serviceRequests.list(query);
  }
}
