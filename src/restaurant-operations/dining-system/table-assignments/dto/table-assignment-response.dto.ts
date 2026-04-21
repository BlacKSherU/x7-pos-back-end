import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class BasicShiftInfoDto {
  @ApiProperty({ example: 1, description: 'Shift ID' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the shift',
  })
  merchantId: number;

  @ApiProperty({ example: 'Restaurant Name', description: 'Merchant name' })
  merchantName: string;
}

export class BasicTableInfoDto {
  @ApiProperty({ example: 1, description: 'Table ID' })
  id: number;

  @ApiProperty({ example: 'Table 5', description: 'Table name' })
  name: string;

  @ApiProperty({ example: 4, description: 'Table capacity' })
  capacity: number;
}

export class BasicCollaboratorInfoDto {
  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Collaborator name' })
  name: string;

  @ApiProperty({ example: 'WAITER', description: 'Collaborator role' })
  role: string;
}

export class TableAssignmentResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the table assignment',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the shift this assignment belongs to',
  })
  shiftId: number;

  @ApiProperty({ example: 1, description: 'ID of the table being assigned' })
  tableId: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the collaborator assigned to the table',
  })
  collaboratorId: number;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Timestamp when the table was assigned',
  })
  assignedAt: Date;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'Timestamp when the table was released',
    required: false,
  })
  releasedAt?: Date;

  @ApiProperty({
    type: BasicShiftInfoDto,
    description: 'Basic shift information',
  })
  shift?: BasicShiftInfoDto;

  @ApiProperty({
    type: BasicTableInfoDto,
    description: 'Basic table information',
  })
  table?: BasicTableInfoDto;

  @ApiProperty({
    type: BasicCollaboratorInfoDto,
    description: 'Basic collaborator information',
  })
  collaborator?: BasicCollaboratorInfoDto;

  @ApiProperty({
    example: 'active',
    description: 'Status of the configuration',
  })
  status: string;
}

export class OneTableAssignmentResponseDto extends SuccessResponse {
  @ApiProperty({ type: TableAssignmentResponseDto })
  data: TableAssignmentResponseDto;
}

export class AllTableAssignmentsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TableAssignmentResponseDto] })
  data: TableAssignmentResponseDto[];
}
