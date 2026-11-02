import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { SupplierCreditNotesService } from './supplier-credit-notes.service';
import { CreateSupplierCreditNoteDto } from './dto/create-supplier-credit-note.dto';
import { UpdateSupplierCreditNoteDto } from './dto/update-supplier-credit-note.dto';
import {
  GetSupplierCreditNotesQueryDto,
  SupplierCreditNoteSortBy,
} from './dto/get-supplier-credit-notes-query.dto';
import { SupplierCreditNoteStatus } from './entities/supplier-credit-note.entity';
import { OneSupplierCreditNoteResponseDto } from './dto/supplier-credit-note-response.dto';
import { PaginatedSupplierCreditNotesResponseDto } from './dto/paginated-supplier-credit-notes-response.dto';

@ApiTags('Finance & HR - Account payable - Supplier credit notes')
@ApiBearerAuth()
@Controller('supplier-credit-notes')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.SUPPLIER_CREDIT_NOTES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@ApiExtraModels(
  OneSupplierCreditNoteResponseDto,
  PaginatedSupplierCreditNotesResponseDto,
)
export class SupplierCreditNotesController {
  constructor(
    private readonly supplierCreditNotesService: SupplierCreditNotesService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create supplier credit note' })
  @ApiBody({ type: CreateSupplierCreditNoteDto })
  @ApiCreatedResponse({
    description: 'Supplier credit note created successfully',
    type: OneSupplierCreditNoteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or validation error' })
  @ApiNotFoundResponse({ description: 'Company or supplier not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async create(
    @Body() dto: CreateSupplierCreditNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.create(
      dto,
      this.merchantCompanyScope(user),
    );
  }

  /**
   * Merchant users are locked to their own company (they can only read/write their own
   * company's credit notes). Portal users get `undefined` → cross-company access preserved.
   */
  private merchantCompanyScope(user: AuthenticatedUser): number | undefined {
    const isMerchant =
      user.role === UserRole.MERCHANT_ADMIN ||
      user.role === UserRole.MERCHANT_USER;
    return isMerchant ? user.merchant?.companyId : undefined;
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all supplier credit notes (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'supplier_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: SupplierCreditNoteStatus })
  @ApiQuery({ name: 'sortBy', required: false, enum: SupplierCreditNoteSortBy })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Supplier credit notes retrieved successfully',
    type: PaginatedSupplierCreditNotesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetSupplierCreditNotesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedSupplierCreditNotesResponseDto> {
    return this.supplierCreditNotesService.findAll(
      query,
      this.merchantCompanyScope(user),
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get supplier credit note by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier credit note retrieved successfully',
    type: OneSupplierCreditNoteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier credit note not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.findOne(
      id,
      this.merchantCompanyScope(user),
    );
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update supplier credit note' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateSupplierCreditNoteDto })
  @ApiOkResponse({
    description: 'Supplier credit note updated successfully',
    type: OneSupplierCreditNoteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({
    description: 'Supplier credit note, company or supplier not found',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierCreditNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.update(
      id,
      dto,
      this.merchantCompanyScope(user),
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete supplier credit note (logical delete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Supplier credit note deleted successfully',
    type: OneSupplierCreditNoteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier credit note not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.remove(
      id,
      this.merchantCompanyScope(user),
    );
  }
}
