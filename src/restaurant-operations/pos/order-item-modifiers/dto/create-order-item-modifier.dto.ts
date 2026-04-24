import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateOrderItemModifierDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  orderItemId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  modifierId: number;

  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0)
  price: number;
}
