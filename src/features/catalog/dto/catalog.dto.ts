import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum ProductSort {
  POPULARITY = 'popularity',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  NAME = 'name',
}

function optionalBoolean(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return value;
}

function stringList(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export class CategoryDto {
  @ApiProperty({ example: 'Central Vacuum Repair' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'Diagnosis and repair for central vacuum systems.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Low suction', 'Unit will not start'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  issues?: string[];
}

export class ProductDto {
  @ApiPropertyOptional({ example: 'FILTER-HEPA-H700' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'HEPA Replacement Filter' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'High-efficiency replacement filter for compatible systems.',
  })
  @IsString()
  description!: string;

  @ApiProperty({ example: 'Filters' })
  @IsString()
  category!: string;

  @ApiProperty({ minimum: 0, example: 39.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ minimum: 0, example: 20 })
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiProperty({
    type: [String],
    format: 'uri',
    example: ['https://cdn.example.com/products/hepa-filter.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];

  @ApiPropertyOptional({ example: 'hepa-replacement-filter' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['HEPA-grade filtration', 'Tool-free installation'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { compatibility: 'H700 series', dimensions: '15 × 8 cm' },
  })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ example: '2-year manufacturer warranty' })
  @IsOptional()
  @IsString()
  warranty?: string;

  @ApiPropertyOptional({ example: 'Ships within 1–2 business days.' })
  @IsOptional()
  @IsString()
  shippingInfo?: string;

  @ApiPropertyOptional({ default: true, example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true, example: true })
  @IsOptional()
  @IsBoolean()
  taxable?: boolean;
}

export class UpdateProductDto extends PartialType(ProductDto) {}

export class ProductQueryDto {
  @ApiPropertyOptional({
    example: 'FILTER-HEPA',
    description: 'Search name, SKU, description, or category.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Filters' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Vacuum', 'Accessories'],
    description: 'One or more store categories. Comma-separated values work.',
  })
  @IsOptional()
  @Transform(({ value }) => stringList(value))
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'When true, only products with stock greater than zero.',
  })
  @IsOptional()
  @Transform(({ value }) => optionalBoolean(value))
  @IsBoolean()
  inStockOnly?: boolean;

  @ApiPropertyOptional({
    enum: ProductSort,
    default: ProductSort.POPULARITY,
  })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
