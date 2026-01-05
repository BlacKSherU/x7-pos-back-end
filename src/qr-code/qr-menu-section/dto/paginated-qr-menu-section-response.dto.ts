//src/qr-code/qr-menu-section/dto/paginated-qr-menu-section-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRMenuSectionResponseDto } from './qr-menu-section-response.dto';

export class PaginatedQRMenuSectionResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of QR Menus',
    type: [QRMenuSectionResponseDto],
  })
  data: QRMenuSectionResponseDto[];

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
