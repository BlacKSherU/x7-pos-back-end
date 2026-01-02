//src/qr-code/qr-location/dto/create-qr-location.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsEnum, IsIn } from 'class-validator';
import { QRMenuType } from 'src/qr-code/constants/qr-menu-type.enum';

export class CreateQRLocationDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @IsNumber()
  @IsNotEmpty()
  merchant: number;

  @ApiProperty({ example: 1, description: 'Identifier of the QR Menu' })
  @IsNumber()
  @IsNotEmpty()
  qrMenu: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Table',
  })
  @IsNumber()
  table: number;

  @ApiProperty({
    example: 'Main Entrance',
    description: 'Name of the location',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'https://example.com/qr-code',
    description: 'URL of the QR code',
  })
  @IsString()
  @IsNotEmpty()
  qr_code_url: string;

  @ApiProperty({
    example: 'base64encodedimagestring',
    description: 'Image of the QR code in base64 format',
  })
  @IsString()
  @IsNotEmpty()
  qr_code_image: string;

  @ApiProperty({
    example: QRMenuType.DELIVERY,
    enum: QRMenuType,
    description: 'Type of QR Menu location',
  })
  @IsEnum(QRMenuType)
  @IsNotEmpty()
  location_type: QRMenuType;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
