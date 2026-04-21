import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../constants/shift-role.enum';
import { ShiftStatus } from '../constants/shift-status.enum';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { Shift } from '../entities/shift.entity';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'Restaurant ABC', description: 'Merchant name' })
  name: string;
}

export class ShiftResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Shift' })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the shift',
  })
  merchantId: number;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Start time of the shift',
  })
  startTime: Date;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'End time of the shift',
  })
  endTime?: Date;

  @ApiProperty({
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the person working the shift',
  })
  role: ShiftRole;

  @ApiProperty({
    enum: ShiftStatus,
    example: ShiftStatus.ACTIVE,
    description: 'Current status of the shift',
  })
  status: ShiftStatus;

  @ApiProperty({
    type: BasicMerchantInfoDto,
    description: 'Basic merchant information',
  })
  merchant: BasicMerchantInfoDto;
}

export class OneShiftResponseDto extends SuccessResponse {
  @ApiProperty({ type: ShiftResponseDto })
  data: ShiftResponseDto;
}

export class AllShiftsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [ShiftResponseDto] })
  data: ShiftResponseDto[];
}
