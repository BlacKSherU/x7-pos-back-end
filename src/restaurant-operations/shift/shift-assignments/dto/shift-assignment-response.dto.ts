import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../../shifts/constants/shift-role.enum';
import { ShiftAssignmentStatus } from '../constants/shift-assignment-status.enum';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { ShiftAssignment } from '../entities/shift-assignment.entity';

export class BasicShiftInfoDto {
  @ApiProperty({ example: 1, description: 'Shift ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID that owns the shift' })
  merchantId: number;

  @ApiProperty({
    example: 'Restaurant ABC',
    description: 'Merchant name that owns the shift',
  })
  merchantName: string;
}

export class BasicCollaboratorInfoDto {
  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Collaborator name' })
  name: string;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Collaborator role',
  })
  role: ShiftRole;
}

export class ShiftAssignmentResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Shift Assignment',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Shift ID associated with the assignment',
  })
  shiftId: number;

  @ApiProperty({
    example: 1,
    description: 'Collaborator ID assigned to the shift',
  })
  collaboratorId: number;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the collaborator during this shift',
  })
  roleDuringShift: ShiftRole;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Start time of the assignment',
  })
  startTime: Date;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'End time of the assignment',
  })
  endTime?: Date;

  @ApiProperty({
    enum: ShiftAssignmentStatus,
    example: ShiftAssignmentStatus.ACTIVE,
    description: 'Current status of the shift assignment',
  })
  status: ShiftAssignmentStatus;

  @ApiProperty({
    type: BasicShiftInfoDto,
    description: 'Basic shift information',
  })
  shift: BasicShiftInfoDto;

  @ApiProperty({
    type: BasicCollaboratorInfoDto,
    description: 'Basic collaborator information',
  })
  collaborator: BasicCollaboratorInfoDto;
}

export class OneShiftAssignmentResponseDto extends SuccessResponse {
  @ApiProperty({ type: ShiftAssignmentResponseDto })
  data: ShiftAssignmentResponseDto;
}

export class AllShiftAssignmentsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [ShiftAssignmentResponseDto] })
  data: ShiftAssignmentResponseDto[];
}
