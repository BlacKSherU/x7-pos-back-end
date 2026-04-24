import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export enum OrderPaymentSortBy {
  CREATED_AT = 'created_at',
  AMOUNT = 'amount',
  METHOD = 'method',
}

export class GetOrderPaymentQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ example: 'card' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @ApiPropertyOptional({ description: 'Filter by refund flag' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isRefund?: boolean;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: OrderPaymentSortBy })
  @IsOptional()
  @IsEnum(OrderPaymentSortBy)
  sortBy?: OrderPaymentSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
