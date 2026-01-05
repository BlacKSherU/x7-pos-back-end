//src/qr-code/qr-menu-item/dto/qr-menu-item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuItem } from '../entity/qr-menu-item.entity';

export class QRMenuItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: { id: 1, name: 'QR Menu Dessert' } })
  qrMenuSection: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Chocolate Cake' } })
  product: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Large Size' } })
  variant: { id: number; name: string };

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 1 })
  display_order: number;

  @ApiProperty({ example: 'Special notes for this menu item' })
  notes: string;

  @ApiProperty({ example: true })
  is_visible: boolean;
}

export class OneQRMenuItemResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenuItem;
}

export class AllQRMenuItemResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenuItem[];
}
