import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { CashDrawersService } from './cash-drawers.service';
import { CreateCashDrawerDto } from './dto/create-cash-drawer.dto';
import { UpdateCashDrawerDto } from './dto/update-cash-drawer.dto';
import { GetCashDrawersQueryDto } from './dto/get-cash-drawers-query.dto';
import {
  CashDrawerResponseDto,
  OneCashDrawerResponseDto,
  AllCashDrawersResponseDto,
} from './dto/cash-drawer-response.dto';
import { PaginatedCashDrawersResponseDto } from './dto/paginated-cash-drawers-response.dto';
import { CashDrawerStatus } from './constants/cash-drawer-status.enum';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';

@ApiTags('Cash Drawers')
@ApiBearerAuth()
@ApiExtraModels(
  CashDrawerResponseDto,
  OneCashDrawerResponseDto,
  AllCashDrawersResponseDto,
  PaginatedCashDrawersResponseDto,
)
@Controller('cash-drawers')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_DRAWERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class CashDrawersController {
  constructor(private readonly cashDrawersService: CashDrawersService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new cash drawer',
    description:
      'Creates a new cash drawer for a specific shift. Only merchant administrators and users can create cash drawers for their merchant.',
  })
  @ApiCreatedResponse({
    description: 'Cash drawer created successfully',
    type: OneCashDrawerResponseDto,
    example: {
      statusCode: 201,
      message: 'Cash drawer created successfully',
      data: {
        id: 1,
        openingBalance: 100.0,
        currentBalance: 100.0,
        closingBalance: null,
        createdAt: '2023-10-01T12:00:00Z',
        updatedAt: '2023-10-01T12:00:00Z',
        status: 'Open',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        shift: {
          id: 1,
          name: 'Morning Shift',
          startTime: '2023-10-01T08:00:00Z',
          endTime: '2023-10-01T16:00:00Z',
          status: 'ACTIVE',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
        openedByCollaborator: {
          id: 1,
          name: 'John Doe',
          role: 'WAITER',
        },
        closedByCollaborator: null,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    example: {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    example: {
      statusCode: 403,
      message:
        'You can only create cash drawers for shifts belonging to your merchant',
    },
  })
  @ApiNotFoundResponse({
    description: 'Resource not found',
    example: {
      statusCode: 404,
      message: 'Shift not found',
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Business rule violation',
    example: {
      statusCode: 409,
      message: 'There is already an open cash drawer for this shift',
    },
  })
  @ApiBody({ type: CreateCashDrawerDto })
  async create(
    @Body() createCashDrawerDto: CreateCashDrawerDto,
    @Request() req,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashDrawersService.create(
      createCashDrawerDto,
      authenticatedUserMerchantId,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all cash drawers',
    description:
      "Retrieves all cash drawers for the authenticated user's merchant with filtering and pagination support.",
  })
  @ApiOkResponse({
    description: 'Cash drawers retrieved successfully',
    type: PaginatedCashDrawersResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash drawers retrieved successfully',
      data: [
        {
          id: 1,
          openingBalance: 100.0,
          currentBalance: 150.5,
          closingBalance: 150.5,
          createdAt: '2023-10-01T12:00:00Z',
          updatedAt: '2023-10-01T12:00:00Z',
          status: 'Close',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
          shift: {
            id: 1,
            name: 'Morning Shift',
            startTime: '2023-10-01T08:00:00Z',
            endTime: '2023-10-01T16:00:00Z',
            status: 'ACTIVE',
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
          },
          openedByCollaborator: {
            id: 1,
            name: 'John Doe',
            role: 'WAITER',
          },
          closedByCollaborator: {
            id: 2,
            name: 'Jane Smith',
            role: 'MANAGER',
          },
        },
      ],
      paginationMeta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters or pagination parameters',
    example: {
      statusCode: 400,
      message: 'Page number must be greater than 0',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    example: {
      statusCode: 403,
      message: 'You must be associated with a merchant to access cash drawers',
    },
  })
  @ApiQuery({
    name: 'shiftId',
    required: false,
    type: Number,
    description: 'Filter by shift ID',
  })
  @ApiQuery({
    name: 'openedBy',
    required: false,
    type: Number,
    description: 'Filter by collaborator who opened the drawer',
  })
  @ApiQuery({
    name: 'closedBy',
    required: false,
    type: Number,
    description: 'Filter by collaborator who closed the drawer',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CashDrawerStatus,
    description: 'Filter by cash drawer status (Open, Close, Pause)',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'id',
      'openingBalance',
      'closingBalance',
      'status',
      'createdAt',
      'updatedAt',
    ],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  async findAll(@Query() query: GetCashDrawersQueryDto, @Request() req) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashDrawersService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a cash drawer by ID',
    description:
      "Retrieves a specific cash drawer by ID. Only cash drawers from the authenticated user's merchant can be accessed.",
  })
  @ApiOkResponse({
    description: 'Cash drawer retrieved successfully',
    type: OneCashDrawerResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash drawer retrieved successfully',
      data: {
        id: 1,
        openingBalance: 100.0,
        currentBalance: 150.5,
        closingBalance: 150.5,
        createdAt: '2023-10-01T12:00:00Z',
        updatedAt: '2023-10-01T12:00:00Z',
        status: 'Close',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        shift: {
          id: 1,
          name: 'Morning Shift',
          startTime: '2023-10-01T08:00:00Z',
          endTime: '2023-10-01T16:00:00Z',
          status: 'ACTIVE',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
        openedByCollaborator: {
          id: 1,
          name: 'John Doe',
          role: 'WAITER',
        },
        closedByCollaborator: {
          id: 2,
          name: 'Jane Smith',
          role: 'MANAGER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid cash drawer ID',
    example: {
      statusCode: 400,
      message: 'Cash drawer ID must be a valid positive number',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    example: {
      statusCode: 403,
      message: 'You can only access cash drawers from your merchant',
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer not found',
    example: {
      statusCode: 404,
      message: 'Cash drawer not found',
    },
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash drawer ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashDrawersService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a cash drawer',
    description:
      "Updates a specific cash drawer by ID. Only cash drawers from the authenticated user's merchant can be updated.",
  })
  @ApiOkResponse({
    description: 'Cash drawer updated successfully',
    type: OneCashDrawerResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash drawer updated successfully',
      data: {
        id: 1,
        openingBalance: 100.0,
        currentBalance: 175.25,
        closingBalance: 175.25,
        createdAt: '2023-10-01T12:00:00Z',
        updatedAt: '2023-10-01T14:30:00Z',
        status: 'Close',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        shift: {
          id: 1,
          name: 'Morning Shift',
          startTime: '2023-10-01T08:00:00Z',
          endTime: '2023-10-01T16:00:00Z',
          status: 'ACTIVE',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
        openedByCollaborator: {
          id: 1,
          name: 'John Doe',
          role: 'WAITER',
        },
        closedByCollaborator: {
          id: 2,
          name: 'Jane Smith',
          role: 'MANAGER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or cash drawer ID',
    example: {
      statusCode: 400,
      message: 'Cash drawer ID must be a valid positive number',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    example: {
      statusCode: 403,
      message: 'You can only update cash drawers from your merchant',
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer or related resource not found',
    example: {
      statusCode: 404,
      message: 'Cash drawer not found',
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Business rule violation',
    example: {
      statusCode: 409,
      message: 'Validation failed',
    },
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash drawer ID' })
  @ApiBody({ type: UpdateCashDrawerDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCashDrawerDto: UpdateCashDrawerDto,
    @Request() req,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashDrawersService.update(
      id,
      updateCashDrawerDto,
      authenticatedUserMerchantId,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a cash drawer',
    description:
      "Deletes a specific cash drawer by ID. Only cash drawers from the authenticated user's merchant can be deleted.",
  })
  @ApiOkResponse({
    description: 'Cash drawer deleted successfully',
    type: OneCashDrawerResponseDto,
    example: {
      statusCode: 200,
      message: 'Cash drawer deleted successfully',
      data: {
        id: 1,
        openingBalance: 100.0,
        currentBalance: 150.5,
        closingBalance: 150.5,
        createdAt: '2023-10-01T12:00:00Z',
        updatedAt: '2023-10-01T12:00:00Z',
        status: 'Close',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        shift: {
          id: 1,
          name: 'Morning Shift',
          startTime: '2023-10-01T08:00:00Z',
          endTime: '2023-10-01T16:00:00Z',
          status: 'ACTIVE',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
        openedByCollaborator: {
          id: 1,
          name: 'John Doe',
          role: 'WAITER',
        },
        closedByCollaborator: {
          id: 2,
          name: 'Jane Smith',
          role: 'MANAGER',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid cash drawer ID',
    example: {
      statusCode: 400,
      message: 'Cash drawer ID must be a valid positive number',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing JWT token',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions or merchant mismatch',
    example: {
      statusCode: 403,
      message: 'You can only delete cash drawers from your merchant',
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash drawer not found',
    example: {
      statusCode: 404,
      message: 'Cash drawer not found',
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Business rule violation',
    example: {
      statusCode: 409,
      message: 'Cannot delete cash drawer due to dependencies',
    },
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash drawer ID' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashDrawersService.remove(id, authenticatedUserMerchantId);
  }
}
