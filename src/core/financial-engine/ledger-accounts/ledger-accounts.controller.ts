import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LedgerAccountsService } from './ledger-accounts.service';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { GetLedgerAccountsQueryDto } from './dto/get-ledger-accounts-query.dto';
import { AllPaginatedLedgerAccounts } from './dto/all-paginated-ledger-accounts.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { AccountType } from './constants/account-type.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('ledger-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerAccountsController {
  constructor(private readonly ledgerAccountsService: LedgerAccountsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new ledger account',
    description:
      "Creates a new ledger account for the authenticated user's company.",
  })
  @ApiCreatedResponse({ description: 'Ledger account created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Ledger account with this code already exists',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  @ApiBody({ type: CreateLedgerAccountDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLedgerAccountDto: CreateLedgerAccountDto,
  ) {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.create(
      merchantId,
      createLedgerAccountDto,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all ledger accounts with pagination and filters',
    description:
      'Retrieves a paginated list of ledger accounts. Users can only see accounts from their own company.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'name', required: false, type: String, example: 'Cash' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: AccountType,
    example: AccountType.ASSET,
  })
  @ApiOkResponse({
    description: 'Paginated list of ledger accounts retrieved successfully',
    type: AllPaginatedLedgerAccounts,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLedgerAccountsQueryDto,
  ): Promise<AllPaginatedLedgerAccounts> {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.findAll(query, merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a ledger account by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Ledger Account ID' })
  @ApiOkResponse({ description: 'Ledger account retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Ledger account not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a ledger account by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Ledger Account ID' })
  @ApiOkResponse({ description: 'Ledger account updated successfully' })
  @ApiNotFoundResponse({ description: 'Ledger account not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data or ID' })
  @ApiConflictResponse({ description: 'Code already in use' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: UpdateLedgerAccountDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLedgerAccountDto: UpdateLedgerAccountDto,
  ) {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.update(
      id,
      merchantId,
      updateLedgerAccountDto,
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
  @ApiOperation({ summary: 'Soft-delete a ledger account by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Ledger Account ID' })
  @ApiOkResponse({ description: 'Ledger account deleted successfully' })
  @ApiNotFoundResponse({ description: 'Ledger account not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.remove(id, merchantId);
  }
}
