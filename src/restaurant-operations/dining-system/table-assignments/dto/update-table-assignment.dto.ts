import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTableAssignmentDto {
  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'Timestamp when the table was released',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  releasedAt?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status: string;
}
