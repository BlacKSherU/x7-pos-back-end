import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'New York', description: 'Location name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '123 Main St', description: 'Location address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  /* @ApiProperty({
    example: 123,
    description: 'Merchant ID associated to the location',
  })
  @IsNumber()
  @IsNotEmpty()
  merchantId: number; */
}
