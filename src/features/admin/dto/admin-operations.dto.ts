import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  QuoteStatus,
  RequestStatus,
  TechnicianVerificationStatus,
} from '../../../../generated/prisma/enums';
import {
  AdminListQueryDto,
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
  ISO_DATE_PATTERN,
} from './admin-query.dto';

export class AdminServiceRequestQueryDto extends AdminListQueryDto {
  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() technicianId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issueId?: string;
}

export class AdminQuotationQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
) {
  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
}

export class AdminScheduleQueryDto {
  @ApiProperty({
    example: '2026-08-01',
    description: 'Inclusive local start date in YYYY-MM-DD format.',
  })
  @Matches(ISO_DATE_PATTERN)
  from!: string;

  @ApiProperty({
    example: '2026-08-31',
    description: 'Inclusive local end date in YYYY-MM-DD format.',
  })
  @Matches(ISO_DATE_PATTERN)
  to!: string;

  @ApiPropertyOptional({
    example: 'America/Toronto',
    default: 'UTC',
    description: 'IANA timezone used to interpret date boundaries.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() technicianId?: string;

  @ApiPropertyOptional({ enum: RequestStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(RequestStatus, { each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) => String(item))
      : String(value).split(',').filter(Boolean),
  )
  status?: RequestStatus[];
}

export class AdminTechnicianQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
) {
  @ApiPropertyOptional({ enum: TechnicianVerificationStatus })
  @IsOptional()
  @IsEnum(TechnicianVerificationStatus)
  verificationStatus?: TechnicianVerificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === true || value === 'true'
      ? true
      : value === false || value === 'false'
        ? false
        : value,
  )
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 'America/Toronto',
    default: 'UTC',
    description: 'IANA timezone used for jobsToday.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class AdminCustomerQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
) {}

export class AdminUpdateTechnicianDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serviceArea?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class AdminUpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notificationEmail?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notificationPush?: boolean;
}

export class AdminEquipmentQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
) {}

export class AdminInletDto {
  @ApiProperty({ example: 'Basement' })
  @IsString()
  @MaxLength(100)
  floor!: string;

  @ApiProperty({ example: 'Standard inlet' })
  @IsString()
  @MaxLength(100)
  type!: string;

  @ApiProperty({ minimum: 0, example: 3 })
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class AdminCreateEquipmentDto {
  @ApiProperty({ example: 'Unit 24' })
  @IsString()
  @MaxLength(200)
  unitNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestId?: string;

  @ApiPropertyOptional({ type: [String], example: ['HEPA upgrade'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFeatures?: string[];

  @ApiPropertyOptional({ type: [AdminInletDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminInletDto)
  inlets?: AdminInletDto[];
}

export class AdminUpdateEquipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  unitNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manufacturer?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  condition?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFeatures?: string[];
}

export class AdminSetInletQuantityDto {
  @ApiProperty({ minimum: 0, example: 4 })
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class AdminEquipmentMediaDto {
  @ApiProperty({
    format: 'uri',
    example: 'https://uploads.example.com/equipment/unit.jpg',
  })
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
