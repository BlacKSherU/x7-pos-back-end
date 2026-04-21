import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { KitchenStationStatus } from '../constants/kitchen-station-status.enum';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';

export enum KitchenStationSortBy {
  NAME = 'name',
  DISPLAY_ORDER = 'displayOrder',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetKitchenStationQueryDto {
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
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Filter by station type',
  })
  @IsOptional()
  @IsEnum(KitchenStationType)
  stationType?: KitchenStationType;

  @ApiPropertyOptional({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Filter by display mode',
  })
  @IsOptional()
  @IsEnum(KitchenDisplayMode)
  displayMode?: KitchenDisplayMode;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: KitchenStationStatus.ACTIVE,
    enum: KitchenStationStatus,
    description: 'Filter by status (active, deleted)',
  })
  @IsOptional()
  @IsEnum(KitchenStationStatus)
  status?: KitchenStationStatus;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: KitchenStationSortBy.CREATED_AT,
    enum: KitchenStationSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(KitchenStationSortBy)
  sortBy?: KitchenStationSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
