import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma/enums';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AdminDashboardDateQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-20',
    description:
      'Local calendar date in YYYY-MM-DD format. Defaults to today in the requested timezone.',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({
    example: 'America/Toronto',
    default: 'UTC',
    description: 'IANA timezone used for calendar-day and month boundaries.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class AdminDashboardLimitQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 25, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}

export class AdminDashboardScheduleQueryDto extends AdminDashboardDateQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 25, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number;
}

export class AdminDashboardRangeQueryDto {
  @ApiPropertyOptional({
    example: '2025-09-01',
    description: 'Inclusive local start date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-20',
    description: 'Inclusive local end date in YYYY-MM-DD format.',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  to?: string;

  @ApiPropertyOptional({
    example: 'America/Toronto',
    default: 'UTC',
    description: 'IANA timezone used to group and bound analytics.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}

export class AdminDashboardDistributionQueryDto extends AdminDashboardRangeQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Holiday service hours' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Our office will be closed on Monday.' })
  @IsString()
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({
    type: [String],
    enum: UserRole,
    example: [UserRole.CUSTOMER],
  })
  @IsOptional()
  @IsArray()
  roles?: UserRole[];
}
