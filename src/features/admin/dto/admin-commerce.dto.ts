import { ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  ReturnStatus,
} from '../../../../generated/prisma/enums';
import {
  AdminDateRangeQueryDto,
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
} from './admin-query.dto';

function optionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

export class AdminProductQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
) {
  @ApiPropertyOptional({ example: 'Filters' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Omit to include active and inactive products.',
  })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  lowStockThreshold: number = 5;
}

export class AdminOrderQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  IntersectionType(AdminSearchQueryDto, AdminDateRangeQueryDto),
) {
  @ApiPropertyOptional({ enum: OrderStatus, enumName: 'OrderStatus' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Customer user ID' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

export class AdminReturnQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  IntersectionType(AdminSearchQueryDto, AdminDateRangeQueryDto),
) {
  @ApiPropertyOptional({ enum: ReturnStatus, enumName: 'ReturnStatus' })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;
}

export class AdminPaymentQueryDto extends IntersectionType(
  AdminPaginationQueryDto,
  IntersectionType(AdminSearchQueryDto, AdminDateRangeQueryDto),
) {
  @ApiPropertyOptional({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentPurpose, enumName: 'PaymentPurpose' })
  @IsOptional()
  @IsEnum(PaymentPurpose)
  purpose?: PaymentPurpose;

  @ApiPropertyOptional({ description: 'Paying user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Service request ID' })
  @IsOptional()
  @IsString()
  requestId?: string;
}
