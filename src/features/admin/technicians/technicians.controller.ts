import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../../common/dto/api-response.dto';
import { AdminGuard } from '../admin.guard';
import {
  AdminTechnicianQueryDto,
  AdminUpdateTechnicianDto,
} from './dto/technicians.dto';
import {
  AdminTechnicianDetailDto,
  AdminTechnicianPageDto,
} from './dto/technicians-response.dto';
import { AdminTechniciansService } from './technicians.service';

@ApiTags('Admin Technician API')
@ApiBearerAuth()
@Controller('admin/technicians')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminTechniciansController {
  constructor(private readonly technicians: AdminTechniciansService) {}

  @Get()
  @ApiOperation({
    summary: 'List technicians with daily jobs and report-review workload',
    description:
      'Technician verification remains on PATCH /users/admin/technicians/:id/verification.',
  })
  @ApiOkResponse({ type: AdminTechnicianPageDto })
  list(@Query() query: AdminTechnicianQueryDto) {
    return this.technicians.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get technician operations detail' })
  @ApiParam({ name: 'id', description: 'Technician user ID' })
  @ApiOkResponse({ type: AdminTechnicianDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(@Param('id') id: string, @Query() query: AdminTechnicianQueryDto) {
    return this.technicians.get(id, query.timezone);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit limited non-credential technician profile fields',
  })
  @ApiParam({ name: 'id', description: 'Technician user ID' })
  @ApiOkResponse({ type: AdminTechnicianDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: AdminUpdateTechnicianDto) {
    return this.technicians.update(id, dto);
  }
}
