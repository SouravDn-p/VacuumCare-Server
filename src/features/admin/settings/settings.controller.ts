import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../../common/dto/api-response.dto';
import { CloudinaryService } from '../../../service/cloudinary/cloudinary.service';
import { AdminGuard } from '../admin.guard';
import {
  UpdateBusinessLogoDto,
  UpdateBusinessSettingsDto,
} from './dto/settings.dto';
import { BusinessSettingsResponseDto } from './dto/settings-response.dto';
import { AdminSettingsService } from './settings.service';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminSettingsController {
  constructor(
    private readonly settings: AdminSettingsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the singleton public business settings' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  get() {
    return this.settings.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Update the singleton public business settings' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  update(@Body() dto: UpdateBusinessSettingsDto) {
    return this.settings.update(dto);
  }

  @Patch('logo')
  @ApiOperation({ summary: 'Update the public business logo URL' })
  @ApiOkResponse({ type: BusinessSettingsResponseDto })
  updateLogo(@Body() dto: UpdateBusinessLogoDto) {
    return this.settings.update({ logoUrl: dto.logoUrl });
  }

  @Post('logo')
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
    return this.settings.update({ logoUrl });
  }
}
