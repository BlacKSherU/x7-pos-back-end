import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import {
  PartnerLinkState,
  PartnerSyncScope,
  PartnerType,
} from '../constants/partner-sync.enums';

/** Alcance común: merchant de la sesión o toda su compañía (asociaciones de compañía). */
export class PartnerSyncScopeQueryDto {
  @ApiPropertyOptional({
    enum: PartnerSyncScope,
    example: PartnerSyncScope.MERCHANT,
    description:
      'merchant = receipts issued by the session merchant; company = receipts of every merchant (branch) of its company',
  })
  @IsOptional()
  @IsEnum(PartnerSyncScope)
  scope?: PartnerSyncScope;

  @ApiPropertyOptional({
    example: 4,
    description:
      'Only with scope=company: narrow to one merchant (branch) of the company',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  merchantId?: number;
}

export class PartnerSyncMetricsQueryDto extends PartnerSyncScopeQueryDto {}

export class PartnerOptionsQueryDto {
  @ApiProperty({ enum: PartnerType, example: PartnerType.CUSTOMER })
  @IsEnum(PartnerType)
  type: PartnerType;

  @ApiPropertyOptional({
    example: 'Pacifico',
    description: 'Name, tax ID or email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PartnerSyncReceiptsQueryDto extends PartnerSyncScopeQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 'INV-0001',
    description:
      'Receipt ID, invoice number, partner name, partner tax ID or fiscal_data text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: PartnerLinkState,
    example: PartnerLinkState.ALL,
    description:
      'linked = explicitly linked receipts; unlinked = receipts that still use the order customer',
  })
  @IsOptional()
  @IsEnum(PartnerLinkState)
  linkState?: PartnerLinkState;

  @ApiPropertyOptional({ enum: ReceiptType, example: ReceiptType.INVOICE })
  @IsOptional()
  @IsEnum(ReceiptType)
  type?: ReceiptType;
}
