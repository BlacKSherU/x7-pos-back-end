import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { CashDrawerHistoryStatus } from '../constants/cash-drawer-history-status.enum';

export class CashDrawerHistoryResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Cash Drawer History',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description:
      'Identifier of the Cash Drawer associated with this history record',
  })
  cashDrawerId: number;

  @ApiProperty({
    description: 'Basic cash drawer information',
    example: {
      id: 1,
      openingBalance: 100.0,
      closingBalance: 150.5,
    },
  })
  cashDrawer: {
    id: number;
    openingBalance: number;
    closingBalance: number | null;
  };

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
  })
  openingBalance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
  })
  closingBalance: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator who opened the cash drawer',
  })
  openedBy: number;

  @ApiProperty({
    description: 'Basic collaborator information who opened the cash drawer',
    example: {
      id: 1,
      name: 'Juan Pérez',
      role: 'waiter',
    },
  })
  openedByCollaborator: {
    id: number;
    name: string;
    role: string;
  };

  @ApiProperty({
    example: 2,
    description: 'Identifier of the Collaborator who closed the cash drawer',
  })
  closedBy: number;

  @ApiProperty({
    description: 'Basic collaborator information who closed the cash drawer',
    example: {
      id: 2,
      name: 'María García',
      role: 'manager',
    },
  })
  closedByCollaborator: {
    id: number;
    name: string;
    role: string;
  };

  @ApiProperty({
    example: CashDrawerHistoryStatus.ACTIVE,
    enum: CashDrawerHistoryStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: CashDrawerHistoryStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Cash Drawer History record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Cash Drawer History record',
  })
  updatedAt: Date;
}

export class OneCashDrawerHistoryResponseDto extends SuccessResponse {
  @ApiProperty({ type: CashDrawerHistoryResponseDto })
  data: CashDrawerHistoryResponseDto;
}
