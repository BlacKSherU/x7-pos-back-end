//src/qr-code/qr-menu-item/dto/create-qr-menu-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class CreateQRMenuItemDto {
  @ApiProperty({ example: 'QR MENU SECTION ID' })
  @IsNumber()
  @IsNotEmpty()
  qrMenuSection: number;

  @ApiProperty({ example: 'PRODUCT ID' })
  @IsNumber()
  @IsNotEmpty()
  product: number;

  @ApiProperty({ example: 'VARIANT ID' })
  @IsNumber()
  @IsNotEmpty()
  variant: number;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({ example: 'DISPLAY ORDER OF THE ITEM' })
  @IsNumber()
  @IsNotEmpty()
  display_order: number;

  @ApiProperty({ example: 'Special instructions for this item' })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  is_visible: boolean;
}
