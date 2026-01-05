//src/qr-code/qr-menu-section/dto/qr-menu-section-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuSection } from '../entity/qr-menu-section.entity';

export class QRMenuSectionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Dessert Section' })
  name: string;

  @ApiProperty({ example: 'All kind of Ice cream' })
  description: string;

  @ApiProperty({ example: { id: 1, name: 'QR Menu Dessert' } })
  qrMenu: { id: number; name: string };

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 1 })
  display_order: number;
}

export class OneQRMenuSectionResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenuSection;
}

export class AllQRMenuSectionResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenuSection[];
}
