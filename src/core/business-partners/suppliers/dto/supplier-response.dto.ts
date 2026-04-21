import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class SupplierResponseDto {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  name: string;

  @ApiProperty({
    example: '12345678-9',
    description: 'Tax ID',
    required: false,
  })
  tax_id?: string;

  @ApiProperty({
    example: 'supplier@example.com',
    description: 'Email',
    required: false,
  })
  email?: string;

  @ApiProperty({
    example: '+123456789',
    description: 'Phone number',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address',
    required: false,
  })
  address?: string;

  @ApiProperty({ description: 'Associated company ID' })
  company_id: number;

  @ApiProperty({ description: 'Creation date' })
  created_at: Date;

  @ApiProperty({ description: 'Last update date' })
  updated_at: Date;
}

export class SupplierLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  id: number;

  @ApiProperty({ example: 'Phone', description: 'Supplier name' })
  name: string;

  @ApiProperty({ example: '12345678-9', description: 'Tax ID' })
  tax_id?: string;

  @ApiProperty({ example: 'supplier@example.com', description: 'Email' })
  email?: string;

  @ApiProperty({ example: 1, description: 'Associated company ID' })
  company_id: number;
}

export class OneSupplierResponse extends SuccessResponse {
  @ApiProperty()
  data: SupplierResponseDto;
}
