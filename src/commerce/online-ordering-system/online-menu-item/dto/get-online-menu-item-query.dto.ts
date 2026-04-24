import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum OnlineMenuItemSortBy {
  ID = 'id',
  MENU_ID = 'menuId',
  PRODUCT_ID = 'productId',
  VARIANT_ID = 'variantId',
  IS_AVAILABLE = 'isAvailable',
  DISPLAY_ORDER = 'displayOrder',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlineMenuItemQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by online menu ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  menuId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by product ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by variant ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  variantId?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by availability status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination (minimum 1)',
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page (minimum 1, maximum 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: OnlineMenuItemSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: OnlineMenuItemSortBy,
  })
  @IsOptional()
  @IsEnum(OnlineMenuItemSortBy)
  sortBy?: OnlineMenuItemSortBy = OnlineMenuItemSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
