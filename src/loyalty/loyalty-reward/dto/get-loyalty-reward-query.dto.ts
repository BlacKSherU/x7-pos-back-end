import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLoyaltyRewardQueryDto {
  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiProperty({
    example: 10,
    description: 'Number of items per page',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  @ApiProperty({
    example: 'Name of the reward',
    description: 'Filter by reward name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Type of the reward',
    description: 'Filter by reward type',
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;
}
