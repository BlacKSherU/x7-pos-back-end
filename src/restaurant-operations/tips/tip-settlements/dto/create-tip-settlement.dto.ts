import { IsNotEmpty, IsNumber, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SettlementMethod } from '../constants/settlement-method.enum';

export class CreateTipSettlementDto {
  @ApiProperty({ example: 1, description: 'Collaborator identifier' })
  @IsNotEmpty({ message: 'Collaborator ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Collaborator ID must be a number' })
  @Min(1, { message: 'Collaborator ID must be greater than 0' })
  collaboratorId: number;

  @ApiProperty({ example: 1, description: 'Shift identifier' })
  @IsNotEmpty({ message: 'Shift ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Shift ID must be a number' })
  @Min(1, { message: 'Shift ID must be greater than 0' })
  shiftId: number;

  @ApiProperty({ example: 150.75, description: 'Total settlement amount' })
  @IsNotEmpty({ message: 'Total amount is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Total amount must be a number' })
  @Min(0, { message: 'Total amount must be greater than or equal to 0' })
  totalAmount: number;

  @ApiProperty({
    example: SettlementMethod.CASH,
    enum: SettlementMethod,
    description: 'Settlement method (cash, payroll, bank_transfer)',
  })
  @IsNotEmpty({ message: 'Settlement method is required' })
  @IsEnum(SettlementMethod, {
    message: 'Settlement method must be one of: cash, payroll, bank_transfer',
  })
  settlementMethod: SettlementMethod;

  @ApiProperty({
    example: 1,
    description: 'User ID who performs the settlement',
    required: false,
  })
  @IsNotEmpty({ message: 'Settled by (user ID) is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Settled by must be a number' })
  @Min(1, { message: 'Settled by must be greater than 0' })
  settledBy: number;
}
