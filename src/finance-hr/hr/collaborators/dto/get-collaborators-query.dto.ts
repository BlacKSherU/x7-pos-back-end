import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ShiftRole } from '../constants/shift-role.enum';
import { CollaboratorStatus } from '../constants/collaborator-status.enum';

export class GetCollaboratorsQueryDto {
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
    example: CollaboratorStatus.ACTIVE,
    enum: CollaboratorStatus,
    description: 'Filter collaborators by status',
  })
  @IsOptional()
  @IsEnum(CollaboratorStatus)
  status?: CollaboratorStatus;
}
