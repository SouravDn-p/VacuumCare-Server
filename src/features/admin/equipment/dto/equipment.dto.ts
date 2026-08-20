import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AdminPaginationQueryDto,
  AdminSearchQueryDto,
} from '../../common/dto/admin-query.dto';

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
