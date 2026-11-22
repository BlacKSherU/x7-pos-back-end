import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import {
  PartnerAssociation,
  PartnerGroupSortBy,
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

/** Filtros por socio y por asociación con la compañía (grid y lista de recibos). */
export class PartnerSyncPartnerFilterQueryDto extends PartnerSyncScopeQueryDto {
  @ApiPropertyOptional({
    enum: PartnerType,
    description: 'Only receipts whose partner is a customer / a supplier',
  })
  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Customer ID: receipts linked to the customer, or whose order belongs to it when not explicitly linked',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({ example: 3, description: 'Supplier ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @ApiPropertyOptional({
    enum: PartnerAssociation,
    description:
      'company = suppliers and customers associated to the company (customer.companyId); merchant = branch-only customers',
  })
  @IsOptional()
  @IsEnum(PartnerAssociation)
  association?: PartnerAssociation;

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
}

export class PartnerSyncReceiptsQueryDto extends PartnerSyncPartnerFilterQueryDto {
  @ApiPropertyOptional({
    example: 'INV-0001',
    description:
      'Receipt ID, invoice number, partner name, partner tax ID or fiscal_data text',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class PartnerSyncPartnersQueryDto extends PartnerSyncPartnerFilterQueryDto {
  @ApiPropertyOptional({
    example: 'Pacifico',
    description: 'Partner ID, name or tax ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: PartnerGroupSortBy,
    example: PartnerGroupSortBy.VOLUME,
  })
  @IsOptional()
  @IsEnum(PartnerGroupSortBy)
  sortBy?: PartnerGroupSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
