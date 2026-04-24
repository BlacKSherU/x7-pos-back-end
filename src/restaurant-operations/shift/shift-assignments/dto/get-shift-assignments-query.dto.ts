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
import { ShiftRole } from '../../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from '../constants/shift-assignment-status.enum';

export class GetShiftAssignmentsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter assignments by shift ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  shiftId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter assignments by collaborator ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  collaboratorId?: number;

  @ApiPropertyOptional({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Filter assignments by role during shift',
  })
  @IsOptional()
  @IsEnum(ShiftRole)
  roleDuringShift?: ShiftRole;

  @ApiPropertyOptional({
    enum: ShiftAssignmentStatus,
    example: ShiftAssignmentStatus.ACTIVE,
    description: 'Filter assignments by status',
  })
  @IsOptional()
  @IsEnum(ShiftAssignmentStatus)
  status?: ShiftAssignmentStatus;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter assignments from this date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'Filter assignments until this date (YYYY-MM-DD format)',
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
    description:
      'Field to sort by (startTime, endTime, roleDuringShift, status)',
    enum: ['startTime', 'endTime', 'roleDuringShift', 'status'],
  })
  @IsOptional()
  @IsEnum(['startTime', 'endTime', 'roleDuringShift', 'status'])
  sortBy?: 'startTime' | 'endTime' | 'roleDuringShift' | 'status' = 'startTime';

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
