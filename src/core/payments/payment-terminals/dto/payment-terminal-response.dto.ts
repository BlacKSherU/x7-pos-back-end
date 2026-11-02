import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { OptionalPaginatedResponse } from 'src/common/dtos/optional-paginated-response.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import { queryBoolean } from '../../merchant-payment-configs/dto/merchant-payment-config-response.dto';

export class PaymentTerminalResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  companyId: number;

  @ApiProperty({ example: 3 })
  merchantId: number;

  @ApiProperty({ example: 1 })
  paymentConfigId: number;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ example: 2, nullable: true })
  cashDrawerId: number | null;

  @ApiProperty({ example: 'Front counter terminal' })
  name: string;

  @ApiProperty({ example: 'Ingenico Lane/3000', nullable: true })
  model: string | null;

  @ApiProperty({ example: 'C032UQ03960231' })
  deviceIdentifier: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OnePaymentTerminalResponseDto extends SuccessResponse {
  @ApiProperty({ type: PaymentTerminalResponseDto })
  data: PaymentTerminalResponseDto;
}

export class AllPaymentTerminalsResponseDto extends OptionalPaginatedResponse {
  @ApiProperty({ type: [PaymentTerminalResponseDto] })
  data: PaymentTerminalResponseDto[];
}

export class GetPaymentTerminalsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  merchantId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentConfigId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Terminals of a register (cash drawer)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cashDrawerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(queryBoolean)
  @IsBoolean()
  isActive?: boolean;
}
