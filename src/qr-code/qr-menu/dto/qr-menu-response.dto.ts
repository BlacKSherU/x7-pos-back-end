//src/qr-code/qr-menu/dto/qr-menu-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenu } from '../entity/qr-menu.entity';
import { QRMenuType } from 'src/qr-code/constants/qr-menu-type.enum';

export class QRMenuResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'QR Menu Dessert' })
  name: string;

  @ApiProperty({ example: 'All kind of dessert' })
  description: string;

  @ApiProperty({ example: { id: 1, name: 'Merchant A' } })
  merchant: { id: number; name: string };

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 'Texas Theme' })
  design_theme: string;

  @ApiProperty({
    example: QRMenuType.DELIVERY,
    enum: QRMenuType,
    description: 'Type of QR Menu',
  })
  qr_type: QRMenuType;
}

export class OneQRMenuResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenu;
}

export class AllQRMenuResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRMenu[];
}
