import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ItemLittleResponseDto } from '../../items/dto/item-response.dto';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class MovementResponseDto {
  @ApiProperty({ example: 1, description: 'Movement ID' })
  id: number;

  @ApiProperty({
    type: () => ItemLittleResponseDto,
    description: 'Associated stock item details',
    nullable: true,
  })
  item: ItemLittleResponseDto | null;

  @ApiProperty({ example: 10, description: 'Quantity of the movement' })
  quantity: number;

  @ApiProperty({
    example: 'IN',
    description: 'Type of movement',
  })
  type: string;

  @ApiProperty({
    example: 'REF-001',
    description: 'Movement reference (optional)',
    nullable: true,
  })
  reference: string | null;

  @ApiProperty({
    example: 'Reason 1',
    description: 'Reason for the movement (optional)',
    nullable: true,
  })
  reason: string | null;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;

  @ApiProperty({
    example: '2023-01-01T12:00:00Z',
    description: 'Movement creation date',
  })
  createdAt: Date;
}

export class OneMovementResponse extends SuccessResponse {
  @ApiProperty()
  data: MovementResponseDto;
}
