import {
  ApiPropertyOptional,
  IntersectionType,
  OmitType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductDto, UpdateProductDto } from '../../../catalog/dto/catalog.dto';
import {
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
} from '../../common/dto/admin-query.dto';

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

export class AdminCreateProductDto extends OmitType(ProductDto, [
  'imageUrls',
] as const) {
  @Type(() => Number)
  declare price: number;

  @Type(() => Number)
  declare stock: number;

  @ApiPropertyOptional({
    type: [String],
    format: 'uri',
    example: ['https://cdn.example.com/products/hepa-filter.jpg'],
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    return value;
  })
  imageUrls?: string[];
}

export class AdminUpdateProductDto extends UpdateProductDto {}
