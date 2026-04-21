import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsPositive,
  Min,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { CashTransactionType } from '../constants/cash-transaction-type.enum';

export class CreateCashTransactionDto {
  @ApiProperty({ example: 10, description: 'Cash drawer ID' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  cashDrawerId: number;

  @ApiProperty({
    example: 200,
    description: 'Order ID associated to the transaction',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  orderId?: number;

  @ApiProperty({
    example: 'sale',
    enum: CashTransactionType,
    description: 'Transaction type',
  })
  @IsEnum(CashTransactionType)
  type: CashTransactionType;

  @ApiProperty({ example: 125.5, description: 'Transaction amount' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 5,
    description: 'Collaborator ID who performed the transaction',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  collaboratorId: number;

  @ApiProperty({ example: 'Some notes about the transaction', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
