import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateCashDrawerDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift for this cash drawer session',
  })
  @IsNumber({}, { message: 'Shift ID must be a valid number' })
  @IsNotEmpty({ message: 'Shift ID is required' })
  @IsPositive({ message: 'Shift ID must be a positive number' })
  shiftId: number;

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
  })
  @IsNumber({}, { message: 'Opening balance must be a valid number' })
  @IsNotEmpty({ message: 'Opening balance is required' })
  @Min(0, { message: 'Opening balance must be greater than or equal to 0' })
  openingBalance: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Closing balance must be a valid number' })
  @IsOptional()
  @Min(0, { message: 'Closing balance must be greater than or equal to 0' })
  closingBalance?: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator who opened the cash drawer',
  })
  @IsNumber({}, { message: 'Opened by must be a valid number' })
  @IsNotEmpty({ message: 'Opened by is required' })
  @IsPositive({ message: 'Opened by must be a positive number' })
  openedBy: number;

  @ApiProperty({
    example: 2,
    description: 'Identifier of the Collaborator who closed the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Closed by must be a valid number' })
  @IsOptional()
  @IsPositive({ message: 'Closed by must be a positive number' })
  closedBy?: number;
}
