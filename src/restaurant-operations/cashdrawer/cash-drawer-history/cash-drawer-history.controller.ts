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
  Request,
  Query,
} from '@nestjs/common';
import { CashDrawerHistoryService } from './cash-drawer-history.service';
import { CreateCashDrawerHistoryDto } from './dto/create-cash-drawer-history.dto';
import { UpdateCashDrawerHistoryDto } from './dto/update-cash-drawer-history.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneCashDrawerHistoryResponseDto } from './dto/cash-drawer-history-response.dto';
import { GetCashDrawerHistoryQueryDto } from './dto/get-cash-drawer-history-query.dto';
import { PaginatedCashDrawerHistoryResponseDto } from './dto/paginated-cash-drawer-history-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { CashDrawerHistoryStatus } from './constants/cash-drawer-history-status.enum';

@ApiTags('Cash Drawer History')
@ApiBearerAuth()
@Controller('cash-drawer-history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashDrawerHistoryController {
  constructor(
    private readonly cashDrawerHistoryService: CashDrawerHistoryService,
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
  @ApiOperation({
    summary: 'Create a new Cash Drawer History record',
    description:
      "Creates a new cash drawer history record for the authenticated user's merchant. Only portal administrators and merchant administrators can create cash drawer history records. The cash drawer and collaborators must exist and belong to the merchant.",
  })
  @ApiCreatedResponse({
    description: 'Cash drawer history created successfully',
    type: OneCashDrawerHistoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only create cash drawer history for cash drawers belonging to your merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer or Collaborator not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateCashDrawerHistoryDto,
    description: 'Cash drawer history creation data',
    examples: {
      example1: {
        summary: 'Create cash drawer history record',
        value: {
          cashDrawerId: 1,
          openingBalance: 100.0,
          closingBalance: 150.5,
          openedBy: 1,
          closedBy: 2,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateCashDrawerHistoryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashDrawerHistoryService.create(
      dto,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Get all Cash Drawer History records with pagination and filters',
    description:
      "Retrieves a paginated list of cash drawer history records for the authenticated user's merchant. Supports filtering by cash drawer, collaborators, status, and creation date.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10,
  })
  @ApiQuery({
    name: 'cashDrawerId',
    required: false,
    type: Number,
    description: 'Filter by cash drawer ID',
    example: 1,
  })
  @ApiQuery({
    name: 'openedBy',
    required: false,
    type: Number,
    description: 'Filter by collaborator who opened the cash drawer',
    example: 1,
  })
  @ApiQuery({
    name: 'closedBy',
    required: false,
    type: Number,
    description: 'Filter by collaborator who closed the cash drawer',
    example: 2,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CashDrawerHistoryStatus,
    description: 'Filter by status (active, deleted)',
    example: CashDrawerHistoryStatus.ACTIVE,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2023-10-01',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['openingBalance', 'closingBalance', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description:
      'Paginated list of cash drawer history records retrieved successfully',
    type: PaginatedCashDrawerHistoryResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view cash drawer history',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetCashDrawerHistoryQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedCashDrawerHistoryResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashDrawerHistoryService.findAll(
      query,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Get a Cash Drawer History record by ID',
    description:
      'Retrieves a specific cash drawer history record by its ID. Users can only access cash drawer history records from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash drawer history ID' })
  @ApiOkResponse({
    description: 'Cash drawer history found successfully',
    type: OneCashDrawerHistoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view cash drawer history from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer history not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid cash drawer history ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashDrawerHistoryService.findOne(
      id,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Update a Cash Drawer History record by ID',
    description:
      "Updates an existing cash drawer history record for the authenticated user's merchant. Only portal administrators and merchant administrators can update cash drawer history records. All fields are optional.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Cash drawer history ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Cash drawer history updated successfully',
    type: OneCashDrawerHistoryResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update cash drawer history from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer history, Cash drawer or Collaborator not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateCashDrawerHistoryDto,
    description: 'Cash drawer history update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update opening and closing balance',
        value: {
          openingBalance: 120.0,
          closingBalance: 180.5,
        },
      },
      example2: {
        summary: 'Update closed by collaborator',
        value: {
          closedBy: 3,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashDrawerHistoryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashDrawerHistoryService.update(
      id,
      dto,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Soft delete a Cash Drawer History record by ID',
    description:
      'Performs a soft delete by changing the cash drawer history status to "deleted". Only merchant administrators can delete cash drawer history records from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Cash drawer history ID to delete',
  })
  @ApiOkResponse({
    description: 'Cash drawer history soft deleted successfully',
    type: OneCashDrawerHistoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete cash drawer history from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer history not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid cash drawer history ID',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Cash drawer history is already deleted',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCashDrawerHistoryResponseDto> {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashDrawerHistoryService.remove(
      id,
      authenticatedUserMerchantId,
    );
  }
}
