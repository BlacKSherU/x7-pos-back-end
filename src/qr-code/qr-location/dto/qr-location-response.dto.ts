//src/qr-code/qr-location/dto/qr-location-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuType } from 'src/qr-code/constants/qr-menu-type.enum';
import { QRLocation } from '../entity/qr-location.entity';

export class QRLocationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: { id: 1, name: 'Merchant A' } })
  merchant: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'QR Menu Dessert' } })
  qrMenu: { id: number; name: string };

  @ApiProperty({ example: { id: 1 } })
  table: { id: number };

  @ApiProperty({ example: 'Main Entrance QR Code' })
  name: string;

  @ApiProperty({ example: 'https://example.com/qr-codes/1' })
  qr_code_url: string;

  @ApiProperty({ example: 'https://example.com/qr-codes/images/1.png' })
  qr_code_image: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({
    example: QRMenuType.TABLE,
    enum: QRMenuType,
    description: 'Type of QR Location',
  })
  location_type: QRMenuType;
}

export class OneQRLocationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRLocation;
}

export class AllQRLocationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: QRLocation[];
}
