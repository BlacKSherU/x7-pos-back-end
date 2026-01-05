//src/qr-code/qr-menu/dto/create-qr-menu.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsIn, IsEnum } from 'class-validator';
import { QRMenuType } from 'src/qr-code/constants/qr-menu-type.enum';

export class CreateQRMenuDto {
  @ApiProperty({ example: 'Merchant' })
  @IsNumber()
  @IsNotEmpty()
  merchant: number;

  @ApiProperty({ example: 'Menu Dessert' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Includes basic features' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({ example: 'Texas Theme' })
  @IsString()
  @IsNotEmpty()
  design_theme: string;

  @ApiProperty({
    example: QRMenuType.DELIVERY,
    enum: QRMenuType,
    description: 'Type of QR Menu',
  })
  @IsEnum(QRMenuType)
  @IsNotEmpty()
  qr_type: QRMenuType;
}
