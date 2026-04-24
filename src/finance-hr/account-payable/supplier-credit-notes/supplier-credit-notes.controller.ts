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

@ApiTags('Supplier credit notes (Account payable)')
@ApiBearerAuth()
@Controller('supplier-credit-notes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(
  OneSupplierCreditNoteResponseDto,
  PaginatedSupplierCreditNotesResponseDto,
)
export class SupplierCreditNotesController {
  constructor(
    private readonly supplierCreditNotesService: SupplierCreditNotesService,
  ) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
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
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.create(dto);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
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
  ): Promise<PaginatedSupplierCreditNotesResponseDto> {
    return this.supplierCreditNotesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
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
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
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
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
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
  ): Promise<OneSupplierCreditNoteResponseDto> {
    return this.supplierCreditNotesService.remove(id);
  }
}
