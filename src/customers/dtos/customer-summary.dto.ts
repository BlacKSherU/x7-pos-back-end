// src/customers/dto/create-customer.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CustomerSummaryDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the User',
  })
  id: number;

  @ApiProperty({ example: 'johndoe', description: 'Name of the customer' })
  name: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Email of the customer',
  })
  email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the customer',
  })
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the customer',
  })
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the customer',
  })
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the customer',
  })
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the customer',
  })
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the customer',
  })
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'Merchant ID of the customer',
  })
  merchant: number;
}

export class CustomerLittleResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the User',
  })
  id: number;

  @ApiProperty({ example: 'johndoe', description: 'Name of the customer' })
  name: string;
}
