import { IsNotEmpty, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CashTipMovementType } from '../constants/cash-tip-movement-type.enum';

export class CreateCashTipMovementDto {
  @ApiProperty({ example: 1, description: 'Cash drawer identifier' })
  @IsNotEmpty({ message: 'Cash drawer ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Cash drawer ID must be a number' })
  @Min(1, { message: 'Cash drawer ID must be greater than 0' })
  cashDrawerId: number;

  @ApiProperty({ example: 1, description: 'Tip identifier' })
  @IsNotEmpty({ message: 'Tip ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Tip ID must be a number' })
  @Min(1, { message: 'Tip ID must be greater than 0' })
  tipId: number;

  @ApiProperty({
    example: CashTipMovementType.IN,
    enum: CashTipMovementType,
    description: 'Movement type (in, out)',
  })
  @IsNotEmpty({ message: 'Movement type is required' })
  @IsEnum(CashTipMovementType, {
    message: 'Movement type must be one of: in, out',
  })
  movementType: CashTipMovementType;

  @ApiProperty({ example: 25.5, description: 'Movement amount' })
  @IsNotEmpty({ message: 'Amount is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;
}
