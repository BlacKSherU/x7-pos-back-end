import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanyStatus } from '../../companies/constants/company-status.enum';
import { MerchantStatus } from '../../merchants/constants/merchant-status.enum';
import { UserRole } from '../../users/constants/role.enum';
import { CompanyProfileMetricsDto } from '../../companies/dtos/company-profile.dto';
import { SaasUserStatus } from './query-saas-merchant-users.dto';
import { SaasTerminalStatus } from './query-saas-merchant-terminals.dto';
import { PaymentProvider } from 'src/core/payments/constants/payment-provider.enum';

// ---- 1. Companies Hub stats ------------------------------------------------------

export class SaasCompaniesStatsDto {
  @ApiProperty({ example: 12 }) totalCompanies: number;
  @ApiProperty({ example: 10 }) activeCompanies: number;
  @ApiProperty({ example: 1 }) suspendedCompanies: number;
  @ApiProperty({ example: 40, description: 'Rows of configuration' })
  tenantConfigurations: number;
  @ApiProperty({ example: 35 }) activeConfigurations: number;
  @ApiProperty({ example: 120, description: 'User profiles of the system' })
  systemProfiles: number;
  @ApiProperty({ example: 25 }) activeMerchants: number;
}

export class SaasCompaniesStatsResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Companies stats retrieved successfully' })
  message: string;
  @ApiProperty({ type: SaasCompaniesStatsDto }) data: SaasCompaniesStatsDto;
}

// ---- 2. Companies directory ------------------------------------------------------

export class SaasSubscriptionTierDto {
  @ApiProperty({ example: 2 }) planId: number;
  @ApiProperty({ example: 'Professional' }) planName: string;
}

export class SaasCompanyListItemDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Acme Corp' }) name: string;
  @ApiProperty({ example: 'Acme Corporation LLC', nullable: true })
  legalName: string | null;
  @ApiProperty({ example: '12-3456789', nullable: true })
  taxId: string | null;
  @ApiProperty({ example: 'contact@acme.com', nullable: true })
  email: string | null;
  @ApiProperty({ example: '+1 555 123 4567', nullable: true })
  phone: string | null;
  @ApiProperty({ example: 'Miami', nullable: true }) city: string | null;
  @ApiProperty({ example: 'USA', nullable: true }) country: string | null;
  @ApiProperty({ enum: CompanyStatus }) status: CompanyStatus;
  @ApiProperty({ example: 'USD' }) baseCurrency: string;
  @ApiProperty({
    type: SaasSubscriptionTierDto,
    nullable: true,
    description:
      'Plan of the current subscription (active, not past its end date); null if none',
  })
  subscriptionTier: SaasSubscriptionTierDto | null;
  @ApiProperty({ example: 3 }) merchantCount: number;
}

export class SaasCompaniesListMetaDto {
  @ApiProperty({ example: 12 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 50 }) limit: number;
  @ApiProperty({ example: 1 }) totalPages: number;
  @ApiProperty({
    type: [SaasSubscriptionTierDto],
    description: 'Every subscription plan, for the tier filter',
  })
  tiers: SaasSubscriptionTierDto[];
}

export class SaasCompaniesListResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Companies retrieved successfully' })
  message: string;
  @ApiProperty({ type: [SaasCompanyListItemDto] })
  data: SaasCompanyListItemDto[];
  @ApiProperty({ type: SaasCompaniesListMetaDto })
  meta: SaasCompaniesListMetaDto;
}

// ---- 3. Company hub --------------------------------------------------------------

export class SaasCompanyHubCompanyDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Acme Corp' }) name: string;
  @ApiProperty({ example: 'Acme Corporation LLC', nullable: true })
  legalName: string | null;
  @ApiProperty({ example: '12-3456789', nullable: true })
  taxId: string | null;
  @ApiProperty({ enum: CompanyStatus }) status: CompanyStatus;
  @ApiProperty({ example: 'USD' }) baseCurrency: string;
  @ApiProperty({ example: 'Miami', nullable: true }) city: string | null;
  @ApiProperty({ example: 'USA', nullable: true }) country: string | null;
}

export class SaasCompanyHubStatsDto {
  @ApiProperty({ example: 4 }) totalMerchants: number;
  @ApiProperty({ example: 3 }) activeMerchants: number;
  @ApiProperty({ example: 18 }) activeUsers: number;
  @ApiProperty({ example: 6 }) configurations: number;
}

export class SaasCompanyHubDto {
  @ApiProperty({ type: SaasCompanyHubCompanyDto })
  company: SaasCompanyHubCompanyDto;
  @ApiProperty({ type: SaasCompanyHubStatsDto }) stats: SaasCompanyHubStatsDto;
}

export class SaasCompanyHubResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Company hub retrieved successfully' })
  message: string;
  @ApiProperty({ type: SaasCompanyHubDto }) data: SaasCompanyHubDto;
}

// ---- 4. Company profile ----------------------------------------------------------

export class SaasCompanyProfileDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Acme Corporation LLC', nullable: true })
  legalName: string | null;
  @ApiProperty({ example: 'Acme Corp', description: 'Stored as company.name' })
  commercialName: string;
  @ApiProperty({ example: '12-3456789', nullable: true })
  taxId: string | null;
  @ApiProperty({ example: 'contact@acme.com', nullable: true })
  email: string | null;
  @ApiProperty({ example: '+1 555 123 4567', nullable: true })
  phone: string | null;
  @ApiProperty({ example: '123 Main Street', nullable: true })
  address: string | null;
  @ApiProperty({ example: 'Miami', nullable: true }) city: string | null;
  @ApiProperty({ example: 'Florida', nullable: true }) state: string | null;
  @ApiProperty({ example: 'USA', nullable: true }) country: string | null;
  @ApiProperty({ example: 'USD' }) baseCurrency: string;
  @ApiProperty({ enum: CompanyStatus }) status: CompanyStatus;
  @ApiProperty({ type: CompanyProfileMetricsDto })
  metrics: CompanyProfileMetricsDto;
}

export class SaasCompanyProfileResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Company profile retrieved successfully' })
  message: string;
  @ApiProperty({ type: SaasCompanyProfileDto }) data: SaasCompanyProfileDto;
}

// ---- 6 / 7. Merchants ------------------------------------------------------------

export class SaasMerchantListItemDto {
  @ApiProperty({ example: 7 }) id: number;
  @ApiProperty({ example: 'Downtown Bistro' }) name: string;
  @ApiProperty({
    example: 'MCH-0007',
    description: '`MCH-` + merchant id with at least 4 digits',
  })
  branchCode: string;
  @ApiProperty({ example: 'contact@store.com', nullable: true })
  email: string | null;
  @ApiProperty({ example: '+15550001234', nullable: true })
  phone: string | null;
  @ApiProperty({ example: '123 Main Street', nullable: true })
  address: string | null;
  @ApiProperty({ example: 'Miami', nullable: true }) city: string | null;
  @ApiProperty({ example: 'Florida', nullable: true }) state: string | null;
  @ApiProperty({ example: 'USA', nullable: true }) country: string | null;
  @ApiProperty({ example: 'America/New_York' }) timezone: string;
  @ApiProperty({ enum: MerchantStatus }) status: MerchantStatus;
  @ApiProperty({ example: 1 }) companyId: number;
}

export class SaasMerchantsListMetaDto {
  @ApiProperty({ example: 4 }) total: number;
  @ApiProperty({
    example: ['Miami', 'Orlando'],
    description:
      'Distinct cities of the merchants of the company (for the filter)',
  })
  cities: string[];
}

export class SaasMerchantsListResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Company merchants retrieved successfully' })
  message: string;
  @ApiProperty({ type: [SaasMerchantListItemDto] })
  data: SaasMerchantListItemDto[];
  @ApiProperty({ type: SaasMerchantsListMetaDto })
  meta: SaasMerchantsListMetaDto;
}

export class SaasMerchantProfileDto extends SaasMerchantListItemDto {
  @ApiProperty({ example: 'Acme Corp' }) companyName: string;
}

export class SaasMerchantProfileResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Merchant retrieved successfully' })
  message: string;
  @ApiProperty({ type: SaasMerchantProfileDto }) data: SaasMerchantProfileDto;
}

// ---- 8. Merchant hub -------------------------------------------------------------

export class SaasMerchantHubMerchantDto {
  @ApiProperty({ example: 7 }) id: number;
  @ApiProperty({ example: 'Downtown Bistro' }) name: string;
  @ApiProperty({ example: 'MCH-0007' }) branchCode: string;
  @ApiProperty({ enum: MerchantStatus }) status: MerchantStatus;
  @ApiProperty({ example: 'Miami', nullable: true }) city: string | null;
  @ApiProperty({ example: 1 }) companyId: number;
  @ApiProperty({ example: 'Acme Corp' }) companyName: string;
}

export class SaasMerchantHubStatsDto {
  @ApiProperty({ example: 2 }) activePosTerminals: number;
  @ApiProperty({ example: 3 }) totalPosTerminals: number;
  @ApiProperty({
    example: 14,
    description:
      "Order payments (refunds excluded) of the merchant created today, in the merchant's time zone",
  })
  transactionsToday: number;
  @ApiProperty({
    example: 2310,
    description: 'All order payments (refunds excluded) of the merchant',
  })
  transactionsTotal: number;
  @ApiProperty({ example: 8 }) activeUsers: number;
  @ApiProperty({ example: 9 }) totalUsers: number;
}

export class SaasMerchantHubDto {
  @ApiProperty({ type: SaasMerchantHubMerchantDto })
  merchant: SaasMerchantHubMerchantDto;
  @ApiProperty({ type: SaasMerchantHubStatsDto })
  stats: SaasMerchantHubStatsDto;
}

export class SaasMerchantHubResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Merchant hub retrieved successfully' })
  message: string;
  @ApiProperty({ type: SaasMerchantHubDto }) data: SaasMerchantHubDto;
}

// ---- 9. Merchant users -----------------------------------------------------------

export class SaasMerchantUserDto {
  @ApiProperty({ example: 15 }) id: number;
  @ApiProperty({ example: 'john_doe', nullable: true })
  username: string | null;
  @ApiProperty({ example: 'john@store.com' }) email: string;
  @ApiProperty({ enum: UserRole, nullable: true }) role: UserRole | null;
  @ApiProperty({ enum: SaasUserStatus }) status: SaasUserStatus;
  @ApiProperty({ example: 7 }) merchantId: number;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
    description:
      'Always null for now: the users table does not record a creation date',
  })
  createdAt: string | null;
}

export class SaasMerchantUsersMetaDto {
  @ApiProperty({
    example: 9,
    description: 'Users of the merchant branch, whatever the filters',
  })
  total: number;
  @ApiProperty({
    example: 8,
    description: 'Active users of the merchant branch, whatever the filters',
  })
  active: number;
}

export class SaasMerchantUsersResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Merchant users retrieved successfully' })
  message: string;
  @ApiProperty({ type: [SaasMerchantUserDto] }) data: SaasMerchantUserDto[];
  @ApiProperty({ type: SaasMerchantUsersMetaDto })
  meta: SaasMerchantUsersMetaDto;
}

// ---- 10. Merchant terminals ------------------------------------------------------

export class SaasMerchantTerminalDto {
  @ApiProperty({ example: 4 }) id: number;
  @ApiProperty({ example: 'Front Counter Bolt' }) name: string;
  @ApiProperty({ example: 'Bolt P3', nullable: true }) model: string | null;
  @ApiProperty({
    example: '16000000000123',
    description:
      'HSN (CardPointe Bolt), Reader ID (Stripe) or serial number (Clover)',
  })
  deviceIdentifier: string;
  @ApiProperty({ enum: PaymentProvider, nullable: true })
  provider: PaymentProvider | null;
  @ApiProperty({
    example: 'CardPointe Santiago',
    nullable: true,
    description: 'Display name of the payment configuration of the terminal',
  })
  paymentConfigName: string | null;
  @ApiProperty({ example: 2, nullable: true }) cashDrawerId: number | null;
  @ApiProperty({ enum: SaasTerminalStatus }) status: SaasTerminalStatus;
  @ApiProperty({ example: 7 }) merchantId: number;
  @ApiProperty({ example: '2026-11-01T10:00:00.000Z' }) createdAt: string;
  @ApiProperty({
    example: '2026-11-05T15:30:00.000Z',
    description: 'Last time the terminal record changed',
  })
  updatedAt: string;
}

export class SaasMerchantTerminalsMetaDto {
  @ApiProperty({
    example: 3,
    description: 'Terminals of the merchant branch, whatever the filters',
  })
  total: number;
  @ApiProperty({
    example: 2,
    description:
      'Active terminals of the merchant branch, whatever the filters',
  })
  active: number;
}

export class SaasMerchantTerminalsResponseDto {
  @ApiProperty({ example: 200 }) statusCode: number;
  @ApiProperty({ example: 'Merchant terminals retrieved successfully' })
  message: string;
  @ApiProperty({ type: [SaasMerchantTerminalDto] })
  data: SaasMerchantTerminalDto[];
  @ApiProperty({ type: SaasMerchantTerminalsMetaDto })
  meta: SaasMerchantTerminalsMetaDto;
}
