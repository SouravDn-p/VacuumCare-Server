import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequestStatus } from '../../../../generated/prisma/enums';
import type { AuthUser } from '../../../common/auth/auth.types';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../../common/dto/api-response.dto';
import {
  EquipmentDto,
  MediaDto,
  MediaFormDto,
  ReportDto,
  UpdateRequestStatusDto,
} from '../../service-requests/dto/service-request.dto';
import {
  EquipmentResponseDto,
  ServiceMediaResponseDto,
  ServiceReportResponseDto,
  ServiceRequestResponseDto,
} from '../../service-requests/dto/service-request-response.dto';
import { RequestsService } from '../../service-requests/requests.service';
import { TechnicianGuard } from '../technician.guard';

@ApiTags('Technician Service Requests')
@ApiBearerAuth()
@Controller('technician/service-requests')
@UseGuards(JwtAuthGuard, TechnicianGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class TechnicianServiceRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'List jobs assigned to the authenticated technician',
    description:
      'Admin assigns the technician and sends the schedule. This list only includes those assigned jobs.',
  })
  @ApiQuery({ name: 'status', required: false, enum: RequestStatus })
  @ApiOkResponse({ type: ServiceRequestResponseDto, isArray: true })
  list(@CurrentUser() user: AuthUser, @Query('status') status?: RequestStatus) {
    return this.requests.listAssigned(user, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one assigned service request',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  one(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.viewAsTechnician(user, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Start a scheduled service request as the assigned technician',
    description:
      'Admin assignment and scheduling live on /admin/service-requests. This endpoint only starts an assigned SCHEDULED job.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.requests.start(user, id, dto);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Submit or update a technician service report' })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiCreatedResponse({ type: ServiceReportResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  report(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReportDto,
  ) {
    return this.requests.submitReport(user, id, dto);
  }

  @Post(':id/equipment')
  @ApiOperation({
    summary: 'Create or update technician equipment and inlet-count details',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiCreatedResponse({ type: EquipmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  equipment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: EquipmentDto,
  ) {
    return this.requests.recordEquipment(user, id, dto);
  }

  @Post(':id/media')
  @ApiOperation({
    summary: 'Add before, after, or other job media to an assigned request',
    description:
      'Send as multipart form data. Upload an image or video on the file field, or pass an already-hosted url. Issue media is submitted by the customer.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: MediaFormDto })
  @ApiCreatedResponse({ type: ServiceMediaResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  media(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.requests.addMedia(user, id, dto, file);
  }
}
