import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TipPoolMemberSortBy {
  WEIGHT = 'weight',
  ROLE = 'role',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetTipPoolMemberQueryDto {
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

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  tipPoolId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  collaboratorId?: number;

  @ApiPropertyOptional({ example: 'waiter' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ enum: TipPoolMemberSortBy })
  @IsOptional()
  sortBy?: TipPoolMemberSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
