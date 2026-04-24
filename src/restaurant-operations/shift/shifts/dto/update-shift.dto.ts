import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../constants/shift-role.enum';
import { ShiftStatus } from '../constants/shift-status.enum';

export class UpdateShiftDto {
  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Start time of the shift',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'End time of the shift (optional)',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the person working the shift',
  })
  @IsEnum(ShiftRole)
  @IsOptional()
  role?: ShiftRole;

  @ApiProperty({
    enum: ShiftStatus,
    example: ShiftStatus.ACTIVE,
    description: 'Status of the shift',
  })
  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;
}
