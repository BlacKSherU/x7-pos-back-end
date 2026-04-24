import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class OrderItemModifierResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderItemId: number;

  @ApiProperty()
  modifierId: number;

  @ApiProperty()
  price: number;
}

export class OneOrderItemModifierResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderItemModifierResponseDto })
  data: OrderItemModifierResponseDto;
}
