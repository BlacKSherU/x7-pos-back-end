// src/customers/dto/create-customer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'johndoe', description: 'Name of the customer' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Email of the customer',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the customer',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the customer',
  })
  @IsNotEmpty()
  @IsString()
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the customer',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the customer',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the customer',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the customer',
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'Company ID of the customer',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  companyId?: number;
}
