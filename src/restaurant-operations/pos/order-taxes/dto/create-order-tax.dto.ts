import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderTaxDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  orderId: number;

  @ApiProperty({ example: 'IVA', description: 'IVA, Service Tax, etc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 19.0, description: 'Rate (e.g. %)' })
  @IsNumber()
  @Min(0)
  @Max(999.99)
  rate: number;

  @ApiProperty({ example: 3.8 })
  @IsNumber()
  @Min(0)
  amount: number;
}
