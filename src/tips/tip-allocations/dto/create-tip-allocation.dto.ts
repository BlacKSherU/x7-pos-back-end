import { IsNotEmpty, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipAllocationRole } from '../constants/tip-allocation-role.enum';

export class CreateTipAllocationDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Tip being allocated',
  })
  @IsNotEmpty({ message: 'Tip ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Tip ID must be a number' })
  @Min(1, { message: 'Tip ID must be greater than 0' })
  tipId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator receiving the allocation',
  })
  @IsNotEmpty({ message: 'Collaborator ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Collaborator ID must be a number' })
  @Min(1, { message: 'Collaborator ID must be greater than 0' })
  collaboratorId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift associated with this allocation',
  })
  @IsNotEmpty({ message: 'Shift ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Shift ID must be a number' })
  @Min(1, { message: 'Shift ID must be greater than 0' })
  shiftId: number;

  @ApiProperty({
    example: TipAllocationRole.WAITER,
    enum: TipAllocationRole,
    description: 'Role for this allocation (waiter, bartender, runner)',
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(TipAllocationRole, { message: 'Role must be one of: waiter, bartender, runner' })
  role: TipAllocationRole;

  @ApiProperty({
    example: 50.00,
    description: 'Percentage of the tip allocated (0-100)',
  })
  @IsNotEmpty({ message: 'Percentage is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Percentage must be a number' })
  @Min(0, { message: 'Percentage must be between 0 and 100' })
  @Max(100, { message: 'Percentage must be between 0 and 100' })
  percentage: number;

  @ApiProperty({
    example: 2.75,
    description: 'Amount allocated from the tip',
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;
}
