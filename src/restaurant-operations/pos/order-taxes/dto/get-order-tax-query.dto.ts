import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export enum OrderTaxSortBy {
  CREATED_AT = 'created_at',
  AMOUNT = 'amount',
  NAME = 'name',
  RATE = 'rate',
}

export class GetOrderTaxQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ example: 'IVA' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

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

  @ApiPropertyOptional({ enum: OrderTaxSortBy })
  @IsOptional()
  @IsEnum(OrderTaxSortBy)
  sortBy?: OrderTaxSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
