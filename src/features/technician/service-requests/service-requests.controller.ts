import {
  BadRequestException,
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
import { EquipmentDto, ReportDto } from '../../service-requests/dto/service-request.dto';
import {
  EquipmentResponseDto,
  ServiceMediaResponseDto,
  ServiceReportResponseDto,
  ServiceRequestResponseDto,
} from '../../service-requests/dto/service-request-response.dto';
import { RequestsService } from '../../service-requests/requests.service';
import {
  TechnicianMediaDto,
  TechnicianMediaFormDto,
  TechnicianUpdateReportDto,
  TechnicianUpdateStatusDto,
  UpdateEquipmentDto,
} from '../dto/technician.dto';
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

  @Get(':id/report')
  @ApiOperation({
    summary: 'Get the service report for an assigned job',
    description:
      'Returns work performed, parts used, visit times, and technician notes.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: ServiceReportResponseDto })
  getReport(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.getReport(user, id);
  }

  @Get(':id/equipment')
  @ApiOperation({
    summary: 'List customer equipment and vacuum-port inventory for this job',
    description:
      'Same equipment shape as the admin dashboard: units, additional features, inlets, and media.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: EquipmentResponseDto, isArray: true })
  listEquipment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.requests.listEquipment(user, id);
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
    summary: 'Update job status as the assigned technician',
    description:
      'The only technician status action is starting a SCHEDULED visit (IN_PROGRESS). Completing the visit is done by submitting the service report.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: ServiceRequestResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TechnicianUpdateStatusDto,
  ) {
    return this.requests.start(user, id, {
      status: dto.status as unknown as RequestStatus,
      note: dto.note,
    });
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Submit or create a technician service report' })
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

  @Patch(':id/report')
  @ApiOperation({
    summary: 'Update an existing technician service report',
    description:
      'Allowed while the job is IN_PROGRESS or REPORT_SUBMITTED. Use POST to create the first report.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiOkResponse({ type: ServiceReportResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  updateReport(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TechnicianUpdateReportDto,
  ) {
    return this.requests.updateReport(user, id, dto);
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

  @Patch(':id/equipment/:equipmentId')
  @ApiOperation({
    summary: 'Update a customer equipment record from an assigned job',
    description:
      'Matches the admin equipment fields: unit details, additional features, and floor inlet counts.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiParam({ name: 'equipmentId', description: 'Equipment record ID' })
  @ApiOkResponse({ type: EquipmentResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  updateEquipment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('equipmentId') equipmentId: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.requests.updateEquipment(user, id, equipmentId, dto);
  }

  @Post(':id/media')
  @ApiOperation({
    summary: 'Upload before, after, equipment, or inlet media for an assigned job',
    description:
      'Send multipart form data with kind plus a raw file. The file is uploaded to Cloudinary. Text URLs are not accepted.',
  })
  @ApiParam({ name: 'id', description: 'Service request ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: TechnicianMediaFormDto })
  @ApiCreatedResponse({ type: ServiceMediaResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  media(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TechnicianMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'A file upload is required. Hosted URLs are not accepted.',
      );
    }
    return this.requests.addMedia(user, id, { kind: dto.kind }, file);
  }
}
