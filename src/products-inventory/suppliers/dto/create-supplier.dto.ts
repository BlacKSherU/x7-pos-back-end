import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+123456789', description: 'Supplier contact info' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsNotEmpty()
  contactInfo: string;

  /* @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the supplier',
  })
  @IsNotEmpty()
  @IsNumber()
  merchantId: number; */
}
