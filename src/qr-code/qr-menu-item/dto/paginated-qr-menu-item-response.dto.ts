//src/qr-code/qr-menu-item/dto/paginated-qr-menu-item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuItemResponseDto } from './qr-menu-item-response.dto';

export class PaginatedQRMenuItemResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of QR Menus',
    type: [QRMenuItemResponseDto],
  })
  data: QRMenuItemResponseDto[];

  @ApiProperty({
    description: 'Pagination info',
    example: {
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
