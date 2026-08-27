import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TechnicianHomeStatsResponseDto {
  @ApiProperty({ example: 'Marc' })
  firstName!: string;

  @ApiProperty({ example: 3, description: 'Assigned jobs scheduled for today.' })
  jobsToday!: number;

  @ApiProperty({ example: 1 })
  inProgress!: number;

  @ApiProperty({
    example: 12,
    description: 'Assigned jobs completed in the current local month.',
  })
  completedThisMonth!: number;

  @ApiProperty({ example: 4.8 })
  averageRating!: number;

  @ApiProperty({ example: '2026-08-27' })
  date!: string;

  @ApiProperty({ example: 'America/Toronto' })
  timezone!: string;
}
