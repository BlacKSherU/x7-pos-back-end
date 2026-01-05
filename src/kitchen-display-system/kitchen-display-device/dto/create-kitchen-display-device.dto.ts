import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

export class CreateKitchenDisplayDeviceDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Kitchen Station (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Station ID must be a number' })
  stationId?: number | null;

  @ApiProperty({ example: 'Kitchen Display 1', description: 'Name of the device' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string;

  @ApiProperty({ example: 'DEV-001', description: 'Unique identifier for the device' })
  @IsString({ message: 'Device identifier must be a string' })
  @IsNotEmpty({ message: 'Device identifier is required' })
  @MaxLength(100, { message: 'Device identifier must not exceed 100 characters' })
  deviceIdentifier: string;

  @ApiPropertyOptional({
    example: '192.168.1.100',
    description: 'IP address of the device',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  @MaxLength(50, { message: 'IP address must not exceed 50 characters' })
  ipAddress?: string | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the device is currently online',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Is online must be a boolean' })
  isOnline?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-15T08:30:00Z',
    description: 'Last synchronization timestamp',
    nullable: true,
    required: false,
  })
  @IsOptional()
  lastSync?: Date | null;
}
