import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MovementsStatus } from '../constants/movements-status';

export class CreateMovementDto {
  @ApiProperty({
    example: 1,
    description: 'Stock Item ID associated with the movement',
  })
  @IsNotEmpty()
  @IsInt()
  stockItemId: number;

  @ApiProperty({ example: 10, description: 'Quantity of the movement' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({
    example: MovementsStatus.IN,
    description: 'Type of movement',
    enum: MovementsStatus,
    default: MovementsStatus.IN,
  })
  @IsNotEmpty()
  @IsEnum(MovementsStatus)
  type?: MovementsStatus;

  @ApiProperty({
    example: 'REF-001',
    description: 'Movement reference (optional)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    example: 'Reason 1',
    description: 'Reason for the movement (optional)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
