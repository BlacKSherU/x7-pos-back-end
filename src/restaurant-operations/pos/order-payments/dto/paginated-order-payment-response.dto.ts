import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { OrderPaymentResponseDto } from './order-payment-response.dto';

export class OrderPaymentPaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}

export class PaginatedOrderPaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OrderPaymentResponseDto] })
  data: OrderPaymentResponseDto[];

  @ApiProperty({ type: OrderPaymentPaginationMetaDto })
  paginationMeta: OrderPaymentPaginationMetaDto;
}
