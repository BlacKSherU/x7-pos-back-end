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
} from 'class-validator';

export enum OrderItemModifierSortBy {
  ID = 'id',
  PRICE = 'price',
}

export class GetOrderItemModifierQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderItemId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  modifierId?: number;

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

  @ApiPropertyOptional({ enum: OrderItemModifierSortBy })
  @IsOptional()
  @IsEnum(OrderItemModifierSortBy)
  sortBy?: OrderItemModifierSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
