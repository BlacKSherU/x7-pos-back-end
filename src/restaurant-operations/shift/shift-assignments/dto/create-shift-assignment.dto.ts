import {
  IsNumber,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from '../constants/shift-assignment-status.enum';

export class CreateShiftAssignmentDto {
  @ApiProperty({ example: 1, description: 'Shift ID for the assignment' })
  @IsNumber()
  @IsNotEmpty()
  shiftId: number;

  @ApiProperty({
    example: 1,
    description: 'Collaborator ID to assign to the shift',
  })
  @IsNumber()
  @IsNotEmpty()
  collaboratorId: number;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the collaborator during this shift',
  })
  @IsEnum(ShiftRole)
  @IsOptional()
  roleDuringShift?: ShiftRole;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Start time of the assignment',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'End time of the assignment (optional)',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({
    enum: ShiftAssignmentStatus,
    example: ShiftAssignmentStatus.ACTIVE,
    description:
      'Status of the shift assignment (optional, defaults to ACTIVE)',
  })
  @IsEnum(ShiftAssignmentStatus)
  @IsOptional()
  status?: ShiftAssignmentStatus;
}
