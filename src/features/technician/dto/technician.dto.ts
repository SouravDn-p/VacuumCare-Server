import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { MediaKind } from '../../../../generated/prisma/enums';
import { ApiRequiredBinaryFile } from '../../../common/dto/api-file.decorator';
import {
  EquipmentDto,
  ReportDto,
  UpdateEquipmentDto,
} from '../../service-requests/dto/service-request.dto';

export enum TechnicianJobStatus {
  IN_PROGRESS = 'IN_PROGRESS',
}

export const TECHNICIAN_MEDIA_KINDS = [
  MediaKind.BEFORE,
  MediaKind.AFTER,
  MediaKind.EQUIPMENT,
  MediaKind.INLET,
] as const;

export class TechnicianHomeStatsQueryDto {
  @ApiPropertyOptional({
    example: 'America/Toronto',
    default: 'UTC',
    description:
      'IANA timezone used for today, this-week, and this-month boundaries.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class TechnicianUpdateStatusDto {
  @ApiProperty({
    enum: TechnicianJobStatus,
    enumName: 'TechnicianJobStatus',
    example: TechnicianJobStatus.IN_PROGRESS,
    description:
      'Technicians may only start an assigned SCHEDULED job. Report submission advances the request separately.',
  })
  @IsEnum(TechnicianJobStatus)
  status!: TechnicianJobStatus;

  @ApiPropertyOptional({ example: 'Arrived on site and started the visit.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class TechnicianMediaDto {
  @ApiProperty({
    enum: TECHNICIAN_MEDIA_KINDS,
    example: MediaKind.BEFORE,
    description: 'Issue photos are customer-only.',
  })
  @IsIn(TECHNICIAN_MEDIA_KINDS)
  kind!: (typeof TECHNICIAN_MEDIA_KINDS)[number];
}

export class TechnicianMediaFormDto extends TechnicianMediaDto {
  @ApiRequiredBinaryFile(
    'Image or video file. Uploaded to Cloudinary; a URL is not accepted.',
  )
  file!: unknown;
}

export class TechnicianNoteDto {
  @ApiProperty({
    example: 'Customer asked to check the garage inlet on the next visit.',
    maxLength: 5000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}

export class TechnicianUpdateReportDto extends PartialType(ReportDto) {}

export { EquipmentDto as TechnicianEquipmentDto, UpdateEquipmentDto };
