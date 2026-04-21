import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';

export class CollaboratorResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Collaborator',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the User associated with the Collaborator',
  })
  user_id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Collaborator',
  })
  merchant_id: number;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Name of the Collaborator',
  })
  name: string;

  @ApiProperty({
    example: ShiftRole.WAITER,
    enum: ShiftRole,
    description: 'Role of the Collaborator',
  })
  role: ShiftRole;

  @ApiProperty({
    example: CollaboratorStatus.ACTIVE,
    enum: CollaboratorStatus,
    description: 'Status of the Collaborator',
  })
  status: CollaboratorStatus;

  @ApiProperty({
    description: 'Basic merchant information',
    example: {
      id: 1,
      name: 'Restaurant ABC',
    },
  })
  merchant: {
    id: number;
    name: string;
  };

  @ApiProperty({
    description: 'Basic user information',
    example: {
      id: 1,
      firstname: 'Juan',
      lastname: 'Pérez',
    },
  })
  user: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export class OneCollaboratorResponseDto extends SuccessResponse {
  @ApiProperty({ type: CollaboratorResponseDto })
  data: CollaboratorResponseDto;
}
