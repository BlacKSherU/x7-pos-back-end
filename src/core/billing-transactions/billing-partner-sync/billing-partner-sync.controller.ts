import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

import { BillingPartnerSyncService } from './billing-partner-sync.service';
import {
  PartnerOptionsQueryDto,
  PartnerSyncMetricsQueryDto,
  PartnerSyncPartnersQueryDto,
  PartnerSyncReceiptsQueryDto,
} from './dto/partner-sync-query.dto';
import { LinkReceiptPartnerDto } from './dto/link-receipt-partner.dto';
import {
  CompanyMerchantsResponseDto,
  OnePartnerSyncReceiptResponseDto,
  PaginatedPartnerGroupsDto,
  PaginatedPartnerSyncReceiptsDto,
  PartnerOptionsResponseDto,
  PartnerSyncMetricsResponseDto,
} from './dto/partner-sync-response.dto';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

/**
 * Billing ↔ Business Partners: métricas B2B, enlace de recibos con clientes/proveedores y
 * recibos agrupados por socio. Todo se limita al merchant de la sesión (o a su compañía con
 * scope=company).
 */
@ApiTags('Core - Billing transactions - Partner sync')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('billing/partner-sync')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS)
export class BillingPartnerSyncController {
  constructor(private readonly partnerSyncService: BillingPartnerSyncService) {}

  /** Merchant del usuario autenticado (Passport lo cuelga de `req.user`). */
  private merchantIdOf(req: AuthenticatedRequest): number {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant for this operation',
      );
    }
    return merchantId;
  }

  @Get('metrics')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'B2B partner billing metrics',
    description:
      'Total B2B invoices, linked customers, corporate credit utilization (outstanding ÷ billed on the orders behind the B2B invoices) and outstanding balances.',
  })
  @ApiOkResponse({
    description: 'Metrics retrieved',
    type: PartnerSyncMetricsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getMetrics(
    @Query() query: PartnerSyncMetricsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PartnerSyncMetricsResponseDto> {
    return this.partnerSyncService.getMetrics(this.merchantIdOf(req), query);
  }

  @Get('partner-options')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Customers or suppliers that can be linked to a receipt',
    description:
      'Customers of any merchant of the company (or associated to the company) and active suppliers of the company.',
  })
  @ApiOkResponse({
    description: 'Partner options retrieved',
    type: PartnerOptionsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getPartnerOptions(
    @Query() query: PartnerOptionsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PartnerOptionsResponseDto> {
    return this.partnerSyncService.getPartnerOptions(
      this.merchantIdOf(req),
      query,
    );
  }

  @Get('receipts')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Active receipts with their business partner',
    description:
      'Partner = explicit link (customer/supplier) or, when there is none, the order customer.',
  })
  @ApiOkResponse({
    description: 'Receipts retrieved',
    type: PaginatedPartnerSyncReceiptsDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findReceipts(
    @Query() query: PartnerSyncReceiptsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedPartnerSyncReceiptsDto> {
    return this.partnerSyncService.findReceipts(this.merchantIdOf(req), query);
  }

  @Patch('receipts/:id/partner')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'LINK CUSTOMER PROFILE: assign a receipt to a customer or supplier',
    description:
      'The receipt must belong to your merchant and the partner to the same company. Fiscally locked or inactive receipts are rejected with 403.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Receipt ID' })
  @ApiBody({ type: LinkReceiptPartnerDto })
  @ApiOkResponse({
    description: 'Receipt linked',
    type: OnePartnerSyncReceiptResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Receipt or partner outside your merchant/company, or receipt fiscally locked',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Receipt or partner not found',
    type: ErrorResponse,
  })
  async linkReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LinkReceiptPartnerDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OnePartnerSyncReceiptResponseDto> {
    return this.partnerSyncService.linkReceipt(id, dto, this.merchantIdOf(req));
  }

  @Get('partners')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Receipts grouped by customer / supplier',
    description:
      'One row per business partner with name, tax ID (fiscal_data or partner), total volume, invoice count and outstanding balance. Filters: customerId, supplierId, partnerType, association (company / merchant), scope and merchantId (company branches).',
  })
  @ApiOkResponse({
    description: 'Partner groups retrieved',
    type: PaginatedPartnerGroupsDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findPartnerGroups(
    @Query() query: PartnerSyncPartnersQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedPartnerGroupsDto> {
    return this.partnerSyncService.findPartnerGroups(
      this.merchantIdOf(req),
      query,
    );
  }

  @Get('company-merchants')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Merchants (branches) of the session company',
    description: 'Options for the company-association filter of the grid.',
  })
  @ApiOkResponse({
    description: 'Company merchants retrieved',
    type: CompanyMerchantsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getCompanyMerchants(
    @Request() req: AuthenticatedRequest,
  ): Promise<CompanyMerchantsResponseDto> {
    return this.partnerSyncService.getCompanyMerchants(this.merchantIdOf(req));
  }

  @Delete('receipts/:id/partner')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Remove the explicit partner link of a receipt',
    description:
      'The receipt goes back to the order customer. Fiscally locked or inactive receipts are rejected with 403.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Receipt ID' })
  @ApiOkResponse({
    description: 'Receipt link removed',
    type: OnePartnerSyncReceiptResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Receipt of another merchant or fiscally locked',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Receipt not found',
    type: ErrorResponse,
  })
  async unlinkReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OnePartnerSyncReceiptResponseDto> {
    return this.partnerSyncService.unlinkReceipt(id, this.merchantIdOf(req));
  }
}
