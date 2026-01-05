import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOnlineDeliveryInfoDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  @IsNumber({}, { message: 'Online order ID must be a number' })
  @IsNotEmpty({ message: 'Online order ID is required' })
  onlineOrderId: number;

  @ApiProperty({ example: 'John Doe', description: 'Customer name for delivery' })
  @IsString({ message: 'Customer name must be a string' })
  @IsNotEmpty({ message: 'Customer name is required' })
  @MaxLength(100, { message: 'Customer name must not exceed 100 characters' })
  customerName: string;

  @ApiProperty({ example: '123 Main Street, Apt 4B', description: 'Delivery address' })
  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(200, { message: 'Address must not exceed 200 characters' })
  address: string;

  @ApiProperty({ example: 'New York', description: 'City for delivery' })
  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100, { message: 'City must not exceed 100 characters' })
  city: string;

  @ApiProperty({ example: '+1-555-123-4567', description: 'Contact phone number' })
  @IsString({ message: 'Phone must be a string' })
  @IsNotEmpty({ message: 'Phone is required' })
  @MaxLength(50, { message: 'Phone must not exceed 50 characters' })
  phone: string;

  @ApiPropertyOptional({
    example: 'Ring the doorbell twice',
    description: 'Special delivery instructions',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Delivery instructions must be a string' })
  deliveryInstructions?: string | null;
}
