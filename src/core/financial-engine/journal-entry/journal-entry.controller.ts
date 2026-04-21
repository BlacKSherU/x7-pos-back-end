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
import { JournalEntryService } from './journal-entry.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { GetJournalEntriesQueryDto } from './dto/get-journal-entries-query.dto';
import { AllPaginatedJournalEntries } from './dto/all-paginated-journal-entries.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JournalEntryStatus } from './constants/journal-entry-status.enum';
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
@Controller('journal-entry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JournalEntryController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

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
    summary: 'Create a new journal entry',
    description:
      'Creates a balanced journal entry. Total debit must equal total credit across all lines. Only DRAFT status entries can be edited or deleted.',
  })
  @ApiCreatedResponse({ description: 'Journal entry created successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid input or unbalanced entry (debit ≠ credit)',
  })
  @ApiConflictResponse({ description: 'Entry number already exists' })
  @ApiNotFoundResponse({ description: 'Company or ledger account not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  @ApiBody({ type: CreateJournalEntryDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createJournalEntryDto: CreateJournalEntryDto,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.create(merchantId, createJournalEntryDto);
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
    summary: 'Get all journal entries with pagination and filters',
    description: "Retrieves paginated journal entries for the user's company.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: JournalEntryStatus })
  @ApiQuery({
    name: 'reference_type',
    required: false,
    type: String,
    example: 'ORDER',
  })
  @ApiOkResponse({
    description: 'Paginated list of journal entries retrieved successfully',
    type: AllPaginatedJournalEntries,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetJournalEntriesQueryDto,
  ): Promise<AllPaginatedJournalEntries> {
    const merchantId = user.merchant.id;
    return this.journalEntryService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a journal entry by ID (includes all lines)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Journal entry retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Journal entry not found' })
  @ApiBadRequestResponse({ description: 'Invalid ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.findOne(id, merchantId);
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
  @ApiOperation({
    summary: 'Update a journal entry (only DRAFT entries)',
    description:
      'Updates a journal entry. Only allowed for entries in DRAFT status. If lines are provided, they fully replace the existing lines and must be balanced.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Journal entry updated successfully' })
  @ApiNotFoundResponse({ description: 'Journal entry not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input, unbalanced entry, or not in DRAFT status',
  })
  @ApiConflictResponse({ description: 'Entry number already in use' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: UpdateJournalEntryDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.update(
      id,
      merchantId,
      updateJournalEntryDto,
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
  @ApiOperation({
    summary: 'Delete a journal entry (only DRAFT entries)',
    description:
      'Permanently deletes a journal entry and all its lines. Only allowed for entries in DRAFT status.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Journal entry deleted successfully' })
  @ApiNotFoundResponse({ description: 'Journal entry not found' })
  @ApiBadRequestResponse({
    description: 'Invalid ID or entry is not in DRAFT status',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.remove(id, merchantId);
  }

  @Post(':id/post')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Post a journal entry (change status from DRAFT to POSTED)',
    description:
      'Validates and posts a journal entry. Once posted, it cannot be modified or deleted.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Journal entry posted successfully' })
  @ApiNotFoundResponse({ description: 'Journal entry not found' })
  @ApiBadRequestResponse({
    description: 'Journal entry is already posted or unbalanced',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  post(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.post(id, merchantId);
  }

  @Post(':id/void')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Void a posted journal entry (change status from POSTED to VOIDED)',
    description:
      'Voids a journal entry. Only posted entries can be voided. This is used for audit purposes instead of deleting records.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Journal entry voided successfully' })
  @ApiNotFoundResponse({ description: 'Journal entry not found' })
  @ApiBadRequestResponse({ description: 'Only posted entries can be voided' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  void(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.void(id, merchantId);
  }
}
