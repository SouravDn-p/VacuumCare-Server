import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QuoteCounterofferStatus,
  QuoteStatus,
  RequestStatus,
  TechnicianVerificationStatus,
} from '../../../../generated/prisma/enums';
import { PaginatedResponseDto } from './paginated-response.dto';

export class AdminNamedEntityDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class AdminPersonSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
}

export class AdminServiceRequestItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty({ enum: RequestStatus }) status!: RequestStatus;
  @ApiProperty() description!: string;
  @ApiProperty({ type: AdminPersonSummaryDto })
  customer!: AdminPersonSummaryDto;
  @ApiPropertyOptional({ type: AdminPersonSummaryDto, nullable: true })
  technician!: AdminPersonSummaryDto | null;
  @ApiProperty({ type: AdminNamedEntityDto })
  category!: AdminNamedEntityDto;
  @ApiPropertyOptional({ type: AdminNamedEntityDto, nullable: true })
  issue!: AdminNamedEntityDto | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  scheduledStart!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminServiceRequestPageDto extends PaginatedResponseDto<AdminServiceRequestItemDto> {
  @ApiProperty({ type: [AdminServiceRequestItemDto] })
  declare items: AdminServiceRequestItemDto[];
}

export class AdminNegotiationSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestedTotal!: number;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty({ enum: QuoteCounterofferStatus })
  status!: QuoteCounterofferStatus;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminQuotationRequestSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestNumber!: string;
  @ApiProperty({ enum: RequestStatus }) status!: RequestStatus;
}

export class AdminQuotationItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() quoteNumber!: string;
  @ApiProperty({ enum: QuoteStatus }) status!: QuoteStatus;
  @ApiProperty() totalAmount!: number;
  @ApiPropertyOptional({ nullable: true }) negotiatedTotal!: number | null;
  @ApiProperty({ type: String, format: 'date-time' }) validUntil!: Date;
  @ApiProperty({ type: AdminQuotationRequestSummaryDto })
  request!: AdminQuotationRequestSummaryDto;
  @ApiProperty({ type: AdminPersonSummaryDto })
  customer!: AdminPersonSummaryDto;
  @ApiPropertyOptional({ type: AdminNegotiationSummaryDto, nullable: true })
  pendingNegotiation!: AdminNegotiationSummaryDto | null;
}

export class AdminQuotationPageDto extends PaginatedResponseDto<AdminQuotationItemDto> {
  @ApiProperty({ type: [AdminQuotationItemDto] })
  declare items: AdminQuotationItemDto[];
}

export class AdminScheduleAddressDto {
  @ApiProperty() line1!: string;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty() zipCode!: string;
}

export class AdminOperationsScheduleItemDto extends AdminServiceRequestItemDto {
  @ApiProperty({ type: String, format: 'date-time' })
  declare scheduledStart: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  scheduledEnd!: Date | null;
  @ApiProperty({ type: AdminScheduleAddressDto })
  address!: AdminScheduleAddressDto;
}

export class AdminTechnicianItemDto extends AdminPersonSummaryDto {
  @ApiProperty() profileId!: string;
  @ApiPropertyOptional({ nullable: true }) employeeId!: string | null;
  @ApiProperty() serviceArea!: string;
  @ApiProperty({ type: [String] }) skills!: string[];
  @ApiProperty() rating!: number;
  @ApiProperty() isAvailable!: boolean;
  @ApiProperty({ enum: TechnicianVerificationStatus })
  verificationStatus!: TechnicianVerificationStatus;
  @ApiProperty() jobsToday!: number;
  @ApiProperty() reportsAwaitingReview!: number;
}

export class AdminTechnicianPageDto extends PaginatedResponseDto<AdminTechnicianItemDto> {
  @ApiProperty({ type: [AdminTechnicianItemDto] })
  declare items: AdminTechnicianItemDto[];
}

export class AdminTechnicianDetailDto extends AdminTechnicianItemDto {
  @ApiPropertyOptional({ nullable: true }) licenseNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) yearsExperience!: number | null;
  @ApiPropertyOptional({ nullable: true }) bio!: string | null;
  @ApiPropertyOptional({ nullable: true }) verificationNotes!: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  verifiedAt!: Date | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminCustomerItemDto extends AdminPersonSummaryDto {
  @ApiPropertyOptional({ nullable: true }) company!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() requestCount!: number;
  @ApiProperty() orderCount!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminCustomerPageDto extends PaginatedResponseDto<AdminCustomerItemDto> {
  @ApiProperty({ type: [AdminCustomerItemDto] })
  declare items: AdminCustomerItemDto[];
}

export class AdminCustomerAddressDto {
  @ApiProperty() id!: string;
  @ApiProperty() line1!: string;
  @ApiPropertyOptional({ nullable: true }) apartment!: string | null;
  @ApiProperty() city!: string;
  @ApiProperty() state!: string;
  @ApiProperty() zipCode!: string;
  @ApiProperty() isPrimary!: boolean;
}

export class AdminCustomerDetailDto extends AdminCustomerItemDto {
  @ApiPropertyOptional({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty() notificationEmail!: boolean;
  @ApiProperty() notificationPush!: boolean;
  @ApiProperty({ type: [AdminCustomerAddressDto] })
  addresses!: AdminCustomerAddressDto[];
}

export class AdminInletResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() floor!: string;
  @ApiProperty() type!: string;
  @ApiProperty() quantity!: number;
}

export class AdminEquipmentMediaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ format: 'uri' }) url!: string;
  @ApiPropertyOptional({ nullable: true }) mimeType!: string | null;
  @ApiPropertyOptional({ nullable: true }) caption!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminEquipmentItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() customerId!: string;
  @ApiPropertyOptional({ nullable: true }) requestId!: string | null;
  @ApiProperty() unitNumber!: string;
  @ApiPropertyOptional({ nullable: true }) manufacturer!: string | null;
  @ApiPropertyOptional({ nullable: true }) model!: string | null;
  @ApiPropertyOptional({ nullable: true }) serialNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) location!: string | null;
  @ApiPropertyOptional({ nullable: true }) condition!: string | null;
  @ApiProperty({ type: [String] }) additionalFeatures!: string[];
  @ApiProperty({ type: [AdminInletResponseDto] })
  inlets!: AdminInletResponseDto[];
  @ApiProperty({ type: [AdminEquipmentMediaResponseDto] })
  media!: AdminEquipmentMediaResponseDto[];
}

export class AdminEquipmentPageDto extends PaginatedResponseDto<AdminEquipmentItemDto> {
  @ApiProperty({ type: [AdminEquipmentItemDto] })
  declare items: AdminEquipmentItemDto[];
}
