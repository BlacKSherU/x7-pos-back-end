import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OnlineStoreStatus } from '../constants/online-store-status.enum';

export enum OnlineStoreSortBy {
  SUBDOMAIN = 'subdomain',
  THEME = 'theme',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlineStoreQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'my-store',
    description: 'Filter by subdomain (partial match)',
  })
  @IsOptional()
  @IsString()
  subdomain?: string;

  @ApiPropertyOptional({
    example: 'default',
    description: 'Filter by theme',
  })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Filter by currency code',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: OnlineStoreStatus.ACTIVE,
    enum: OnlineStoreStatus,
    description: 'Filter by status (active, deleted)',
  })
  @IsOptional()
  @IsEnum(OnlineStoreStatus)
  status?: OnlineStoreStatus;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: OnlineStoreSortBy.CREATED_AT,
    enum: OnlineStoreSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(OnlineStoreSortBy)
  sortBy?: OnlineStoreSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
