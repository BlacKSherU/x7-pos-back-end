import { OrderLittleResponseDto } from 'src/orders/dto/order-response.dto';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ApiProperty } from '@nestjs/swagger';
import { CashTransactionLittleResponseDto } from 'src/cash-transactions/dto/cash-transaction-response.dto';
import { LoyaltyCustomerLittleResponseDto } from 'src/loyalty/loyalty-customer/dto/loyalty-customer-response.dto';

export class LoyaltyPointsTransactionResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the loyalty points transaction',
  })
  id: number;

  @ApiProperty({
    description: 'Description of the loyalty points transaction',
    nullable: true,
  })
  description: string;

  @ApiProperty({
    example: 'ORDER',
    description: 'Status of the loyalty points transaction',
  })
  source: string;

  @ApiProperty({
    example: 100,
    description: 'Amount of loyalty points',
  })
  points: number;

  @ApiProperty({
    type: () => LoyaltyCustomerLittleResponseDto,
    description: 'loyalty customer details',
    nullable: true,
  })
  loyaltyCustomer: LoyaltyCustomerLittleResponseDto | null;

  @ApiProperty({
    type: () => OrderLittleResponseDto,
    nullable: true,
    description: 'Associated order details',
  })
  order: OrderLittleResponseDto | null;

  @ApiProperty({
    type: () => CashTransactionLittleResponseDto,
    description: 'Associated payment transaction details',
    nullable: true,
  })
  payment: CashTransactionLittleResponseDto | null;

  @ApiProperty({
    description: 'Timestamp of when the transaction was created',
  })
  createdAt: Date;
}

export class OneLoyaltyPointsTransactionResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyPointsTransactionResponseDto,
    description: 'The loyalty points transaction',
  })
  data: LoyaltyPointsTransactionResponseDto;
}
