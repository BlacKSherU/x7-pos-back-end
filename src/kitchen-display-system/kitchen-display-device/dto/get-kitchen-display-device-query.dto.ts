import { IsOptional, IsEnum, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum KitchenDisplayDeviceSortBy {
  ID = 'id',
  STATION_ID = 'stationId',
  NAME = 'name',
  DEVICE_IDENTIFIER = 'deviceIdentifier',
  IP_ADDRESS = 'ipAddress',
  IS_ONLINE = 'isOnline',
  LAST_SYNC = 'lastSync',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetKitchenDisplayDeviceQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by kitchen station ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  stationId?: number;

  @ApiPropertyOptional({
    example: 'Kitchen Display 1',
    description: 'Filter by device name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'DEV-001',
    description: 'Filter by device identifier',
  })
  @IsOptional()
  @IsString()
  deviceIdentifier?: string;

  @ApiPropertyOptional({
    example: '192.168.1.100',
    description: 'Filter by IP address',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by online status',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOnline?: boolean;

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
    example: KitchenDisplayDeviceSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: KitchenDisplayDeviceSortBy,
  })
  @IsOptional()
  @IsEnum(KitchenDisplayDeviceSortBy)
  sortBy?: KitchenDisplayDeviceSortBy = KitchenDisplayDeviceSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}







