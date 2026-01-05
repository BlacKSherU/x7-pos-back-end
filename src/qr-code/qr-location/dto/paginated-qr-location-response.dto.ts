//src/qr-code/qr-location/dto/paginated-qr-location-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QRLocationResponseDto } from './qr-location-response.dto';

export class PaginatedQRLocationResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of QR Menus',
    type: [QRLocationResponseDto],
  })
  data: QRLocationResponseDto[];

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
