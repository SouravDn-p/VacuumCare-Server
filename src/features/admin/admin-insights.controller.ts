import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { CloudinaryService } from '../../service/cloudinary/cloudinary.service';
import { AdminInsightsService } from './admin-insights.service';
import { AdminGuard } from './admin.guard';
import {
  AdminNotificationQueryDto,
  AdminReportQueryDto,
  UpdateBusinessLogoDto,
  UpdateBusinessSettingsDto,
} from './dto/admin-insights.dto';
import {
  AdminNotificationPageResponseDto,
  AdminReportOverviewResponseDto,
  BusinessSettingsResponseDto,
} from './dto/admin-insights-response.dto';

@ApiTags('Admin Insights & Settings')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminInsightsController {
  constructor(
    private readonly insights: AdminInsightsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get('reports/overview')
  @ApiOperation({ summary: 'Get normalized business and service report data' })
  @ApiOkResponse({ type: AdminReportOverviewResponseDto })
  overview(@Query() query: AdminReportQueryDto) {
    return this.insights.overview(query);
  }

  @Get('reports/export.csv')
  @ApiOperation({ summary: 'Export the normalized report data as CSV' })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    schema: { type: 'string', example: '"section","metric","value"' },
  })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async csv(
    @Query() query: AdminReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${query.from}-${query.to}.csv"`,
    );
    return this.insights.csv(query);
  }

  @Get('reports/export.pdf')
  @ApiOperation({ summary: 'Export the normalized report data as PDF' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @Query() query: AdminReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${query.from}-${query.to}.pdf"`,
    );
    return this.insights.pdf(query);
  }

  @Get('notifications')
  @ApiOperation({
    summary:
      'List paginated notifications for the current administrator with unread count',
  })
  @ApiOkResponse({ type: AdminNotificationPageResponseDto })
  notifications(
    @CurrentUser() user: AuthUser,
    @Query() query: AdminNotificationQueryDto,
  ) {
    return this.insights.notifications(user.id, query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get the singleton public business settings' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  settings() {
    return this.insights.settings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update the singleton public business settings' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  updateSettings(@Body() dto: UpdateBusinessSettingsDto) {
    return this.insights.updateSettings(dto);
  }

  @Patch('settings/logo')
  @ApiOperation({ summary: 'Update the public business logo URL' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  updateLogo(@Body() dto: UpdateBusinessLogoDto) {
    return this.insights.updateSettings({ logoUrl: dto.logoUrl });
  }

  @Post('settings/logo')
  @ApiOperation({
    summary: 'Upload a business logo image through Cloudinary',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Logo image uploaded to Cloudinary.',
        },
      },
      required: ['logo'],
    },
  })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(@UploadedFile() logo?: Express.Multer.File) {
    if (!logo) throw new BadRequestException('A logo image is required');
    if (!logo.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are supported');
    }
    const logoUrl = await this.cloudinary.uploadFile(logo, 'vacuumCare/logos');
    return this.insights.updateSettings({ logoUrl });
  }
}
