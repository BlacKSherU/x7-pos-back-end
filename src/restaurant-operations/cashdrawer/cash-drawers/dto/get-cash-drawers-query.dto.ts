import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CashDrawerStatus } from '../constants/cash-drawer-status.enum';

export enum CashDrawerSortBy {
  ID = 'id',
  OPENING_BALANCE = 'openingBalance',
  CLOSING_BALANCE = 'closingBalance',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum CashDrawerSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class GetCashDrawersQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by shift ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Shift ID must be a valid number' })
  shiftId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by collaborator who opened the drawer',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Opened by must be a valid number' })
  openedBy?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by collaborator who closed the drawer',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Closed by must be a valid number' })
  closedBy?: number;

  @ApiPropertyOptional({
    example: CashDrawerStatus.OPEN,
    enum: CashDrawerStatus,
    description: 'Filter by cash drawer status',
  })
  @IsOptional()
  @IsEnum(CashDrawerStatus, {
    message: 'Status must be a valid CashDrawerStatus value',
  })
  status?: CashDrawerStatus;

  @ApiPropertyOptional({
    example: '2023-10-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Created date must be a valid date in YYYY-MM-DD format' },
  )
  createdDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Page must be a valid number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit must be a valid number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    example: CashDrawerSortBy.CREATED_AT,
    enum: CashDrawerSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(CashDrawerSortBy, { message: 'Sort by must be a valid field' })
  sortBy?: CashDrawerSortBy = CashDrawerSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: CashDrawerSortOrder.DESC,
    enum: CashDrawerSortOrder,
    description: 'Sort order',
  })
  @IsOptional()
  @IsEnum(CashDrawerSortOrder, { message: 'Sort order must be ASC or DESC' })
  sortOrder?: CashDrawerSortOrder = CashDrawerSortOrder.DESC;
}
