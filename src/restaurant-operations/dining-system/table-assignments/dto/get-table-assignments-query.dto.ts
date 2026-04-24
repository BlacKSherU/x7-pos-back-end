import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetTableAssignmentsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by shift ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  shiftId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by table ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  tableId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by collaborator ID',
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  collaboratorId?: number;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by assigned date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  assignedDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'assignedAt',
    description: 'Field to sort by',
    enum: ['id', 'assignedAt', 'releasedAt', 'created_at'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['id', 'assignedAt', 'releasedAt', 'created_at'])
  sortBy?: string = 'assignedAt';

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['active', 'inactive', 'deleted'],
    example: 'active',
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'deleted'])
  status?: string;
}
