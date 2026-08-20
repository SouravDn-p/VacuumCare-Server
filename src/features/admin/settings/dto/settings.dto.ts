import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

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
  @ApiProperty({ example: 'https://cdn.example.com/logo.png' })
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  logoUrl!: string;
}
