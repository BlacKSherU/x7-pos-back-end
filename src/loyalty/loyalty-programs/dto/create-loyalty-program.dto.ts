import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLoyaltyProgramDto {
  @ApiProperty({
    example: 'Gold Program',
    description: 'Name of the loyalty program',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Earn points for every purchase',
    description: 'Description of the loyalty program',
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the loyalty program is active',
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Points earned per currency unit (e.g., 1 point per $1)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  points_per_currency: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to redeem a reward',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  min_points_to_redeem: number;
}
