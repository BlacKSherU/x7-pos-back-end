import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Phone', description: 'Name of the Product' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SKU123', description: 'SKU of the Product' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 999.99, description: 'Base price of the Product' })
  @IsNumber()
  @IsPositive()
  basePrice: number;

  /* @ApiProperty({ example: 1, description: 'ID of the Merchant' })
  @IsNumber()
  merchantId: number; */

  @ApiProperty({
    example: 1,
    description: 'ID of the Category',
    required: false,
  })
  @IsNotEmpty()
  @IsNumber()
  categoryId?: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the Supplier',
    required: false,
  })
  @IsNotEmpty()
  @IsNumber()
  supplierId?: number;
}
