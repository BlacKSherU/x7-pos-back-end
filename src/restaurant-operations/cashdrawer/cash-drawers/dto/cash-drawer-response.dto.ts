import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { CashDrawerStatus } from '../constants/cash-drawer-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'Restaurant ABC', description: 'Merchant name' })
  name: string;
}

export class BasicShiftInfoDto {
  @ApiProperty({ example: 1, description: 'Shift ID' })
  id: number;

  @ApiProperty({ example: 'Morning Shift', description: 'Shift name' })
  name: string;

  @ApiProperty({
    example: '2023-10-01T08:00:00Z',
    description: 'Shift start time',
  })
  startTime: Date;

  @ApiProperty({
    example: '2023-10-01T16:00:00Z',
    description: 'Shift end time',
  })
  endTime: Date;

  @ApiProperty({ example: 'ACTIVE', description: 'Shift status' })
  status: string;

  @ApiProperty({
    type: () => BasicMerchantInfoDto,
    description: 'Merchant information',
  })
  merchant: BasicMerchantInfoDto;
}

export class BasicCollaboratorInfoDto {
  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Collaborator name' })
  name: string;

  @ApiProperty({ example: 'WAITER', description: 'Collaborator role' })
  role: string;
}

export class CashDrawerResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Cash Drawer',
  })
  id: number;

  @ApiProperty({ example: 100.0, description: 'Opening balance amount' })
  openingBalance: number;

  @ApiProperty({ example: 125.5, description: 'Current balance amount' })
  currentBalance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount',
    nullable: true,
  })
  closingBalance: number | null;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    example: CashDrawerStatus.OPEN,
    enum: CashDrawerStatus,
    description: 'Status of the cash drawer',
  })
  status: CashDrawerStatus;

  @ApiProperty({
    type: () => BasicMerchantInfoDto,
    description: 'Merchant information',
  })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({
    type: () => BasicShiftInfoDto,
    description: 'Shift information',
  })
  shift: BasicShiftInfoDto;

  @ApiProperty({
    type: () => BasicCollaboratorInfoDto,
    description: 'Collaborator who opened the drawer',
  })
  openedByCollaborator: BasicCollaboratorInfoDto;

  @ApiProperty({
    type: () => BasicCollaboratorInfoDto,
    description: 'Collaborator who closed the drawer',
    nullable: true,
  })
  closedByCollaborator: BasicCollaboratorInfoDto | null;
}

export class OneCashDrawerResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => CashDrawerResponseDto,
    description: 'Cash drawer data',
  })
  data: CashDrawerResponseDto;
}

export class AllCashDrawersResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => [CashDrawerResponseDto],
    description: 'List of cash drawers',
  })
  data: CashDrawerResponseDto[];
}
