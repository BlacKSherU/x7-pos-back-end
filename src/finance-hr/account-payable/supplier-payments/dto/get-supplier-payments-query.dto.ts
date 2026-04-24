import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SupplierPaymentStatus } from '../constants/supplier-payment-status.enum';

export enum SupplierPaymentSortBy {
  CREATED_AT = 'created_at',
  PAYMENT_DATE = 'payment_date',
  PAYMENT_NUMBER = 'payment_number',
  TOTAL_AMOUNT = 'total_amount',
  ALLOCATED_AMOUNT = 'allocated_amount',
  STATUS = 'status',
}

export class GetSupplierPaymentsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 10, description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  company_id?: number;

  @ApiPropertyOptional({ example: 5, description: 'Filter by supplier ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  supplier_id?: number;

  @ApiPropertyOptional({
    example: SupplierPaymentStatus.DRAFT,
    enum: SupplierPaymentStatus,
  })
  @IsOptional()
  @IsEnum(SupplierPaymentStatus)
  status?: SupplierPaymentStatus;

  @ApiPropertyOptional({
    example: SupplierPaymentSortBy.CREATED_AT,
    enum: SupplierPaymentSortBy,
  })
  @IsOptional()
  @IsEnum(SupplierPaymentSortBy)
  sortBy?: SupplierPaymentSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
