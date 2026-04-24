import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class OrderTaxResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  rate: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  createdAt: Date;
}

export class OneOrderTaxResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderTaxResponseDto })
  data: OrderTaxResponseDto;
}
