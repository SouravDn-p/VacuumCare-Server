import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaymentStatus } from '../../../../generated/prisma/enums';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AdminReportQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @Matches(ISO_DATE_PATTERN)
  from!: string;

  @ApiProperty({ example: '2026-08-20' })
  @Matches(ISO_DATE_PATTERN)
  to!: string;

  @ApiPropertyOptional({ example: 'America/Toronto', default: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ description: 'Assigned technician user ID' })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Service category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class AdminNotificationQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ example: '2026-08-20' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({ example: 'America/Toronto', default: 'UTC' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class BusinessSettingsDto {
  @ApiPropertyOptional({ example: 'Vacuum Care' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessName?: string;

  @ApiPropertyOptional({ example: '+1 416 555 0100' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  officePhone?: string;

  @ApiPropertyOptional({ example: 'support@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  serviceArea?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  logoUrl?: string;
}

export class UpdateBusinessSettingsDto extends PartialType(
  BusinessSettingsDto,
) {}

export class UpdateBusinessLogoDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  logoUrl!: string;
}
