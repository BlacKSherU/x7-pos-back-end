import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { CashTransactionStatus } from '../constants/cash-transaction-status.enum';
import { CashTransactionType } from '../constants/cash-transaction-type.enum';

export enum CashTransactionSortBy {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
  TYPE = 'type',
  STATUS = 'status',
}

export class GetCashTransactionsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cashDrawerId?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ enum: CashTransactionType })
  @IsOptional()
  @IsEnum(CashTransactionType)
  type?: CashTransactionType;

  @ApiPropertyOptional({ enum: CashTransactionStatus })
  @IsOptional()
  @IsEnum(CashTransactionStatus)
  status?: CashTransactionStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: CashTransactionSortBy })
  @IsOptional()
  @IsEnum(CashTransactionSortBy)
  sortBy?: CashTransactionSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
