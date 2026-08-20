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
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { AdminGuard } from './admin.guard';
import { AdminPeopleService } from './admin-people.service';
import {
  AdminCustomerQueryDto,
  AdminTechnicianQueryDto,
  AdminUpdateCustomerDto,
  AdminUpdateTechnicianDto,
} from './dto/admin-operations.dto';
import {
  AdminCustomerDetailDto,
  AdminCustomerPageDto,
  AdminTechnicianDetailDto,
  AdminTechnicianPageDto,
} from './dto/admin-operations-response.dto';

@ApiTags('Admin People')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminPeopleController {
  constructor(private readonly people: AdminPeopleService) {}

  @Get('technicians')
  @ApiOperation({
    summary: 'List technicians with daily jobs and report-review workload',
    description:
      'Technician verification remains on PATCH /users/admin/technicians/:id/verification.',
  })
  @ApiOkResponse({ type: AdminTechnicianPageDto })
  technicians(@Query() query: AdminTechnicianQueryDto) {
    return this.people.technicians(query);
  }

  @Get('technicians/:id')
  @ApiOperation({ summary: 'Get technician operations detail' })
  @ApiParam({ name: 'id', description: 'Technician user ID' })
  @ApiOkResponse({ type: AdminTechnicianDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  technician(@Param('id') id: string, @Query() query: AdminTechnicianQueryDto) {
    return this.people.technician(id, query.timezone);
  }

  @Patch('technicians/:id')
  @ApiOperation({
    summary: 'Edit limited non-credential technician profile fields',
  })
  @ApiParam({ name: 'id', description: 'Technician user ID' })
  @ApiOkResponse({ type: AdminTechnicianDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  updateTechnician(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTechnicianDto,
  ) {
    return this.people.updateTechnician(id, dto);
  }

  @Get('customers')
  @ApiOperation({ summary: 'List searchable customer operations profiles' })
  @ApiOkResponse({ type: AdminCustomerPageDto })
  customers(@Query() query: AdminCustomerQueryDto) {
    return this.people.customers(query);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer profile detail and counts' })
  @ApiParam({ name: 'id', description: 'Customer user ID' })
  @ApiOkResponse({ type: AdminCustomerDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  customer(@Param('id') id: string) {
    return this.people.customer(id);
  }

  @Patch('customers/:id')
  @ApiOperation({
    summary: 'Edit limited non-credential customer profile fields',
  })
  @ApiOkResponse({ type: AdminCustomerDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  updateCustomer(@Param('id') id: string, @Body() dto: AdminUpdateCustomerDto) {
    return this.people.updateCustomer(id, dto);
  }
}
