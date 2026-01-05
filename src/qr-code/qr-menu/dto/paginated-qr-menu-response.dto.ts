//src/qr-code/qr-menu/dto/paginated-qr-menu-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuResponseDto } from './qr-menu-response.dto';

export class PaginatedQRMenuResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of QR Menus',
    type: [QRMenuResponseDto],
  })
  data: QRMenuResponseDto[];

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
