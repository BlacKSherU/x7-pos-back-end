import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ShiftRole } from '../constants/shift-role.enum';
import { ShiftStatus } from '../constants/shift-status.enum';

export class GetShiftsQueryDto {
  @ApiPropertyOptional({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Filter shifts by role',
  })
  @IsOptional()
  @IsEnum(ShiftRole)
  role?: ShiftRole;

  @ApiPropertyOptional({
    enum: ShiftStatus,
    example: ShiftStatus.ACTIVE,
    description: 'Filter shifts by status',
  })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter shifts from this date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'Filter shifts until this date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination (minimum 1)',
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page (minimum 1, maximum 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'startTime',
    description: 'Field to sort by (startTime, endTime, role, status)',
    enum: ['startTime', 'endTime', 'role', 'status'],
  })
  @IsOptional()
  @IsEnum(['startTime', 'endTime', 'role', 'status'])
  sortBy?: 'startTime' | 'endTime' | 'role' | 'status' = 'startTime';

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
