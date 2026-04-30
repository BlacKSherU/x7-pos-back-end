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
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { OneShiftResponseDto } from './dto/shift-response.dto';
import { GetShiftsQueryDto } from './dto/get-shifts-query.dto';
import { PaginatedShiftsResponseDto } from './dto/paginated-shifts-response.dto';
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
  ApiExtraModels,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';

@ApiTags('Shifts')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('shifts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.SHIFTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

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
    summary: 'Create a new shift',
    description:
      "Creates a new shift for the authenticated user's merchant. Only merchant administrators can create shifts. The shift number must be unique within the merchant. The start time is required, end time is optional. Role defaults to WAITER if not specified.",
  })
  @ApiCreatedResponse({
    description: 'Shift created successfully',
    type: OneShiftResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Shift created successfully',
        data: {
          id: 1,
          merchantId: 1,
          number: 'SHIFT-001',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter',
          status: 'active',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      examples: {
        invalidTimeFormat: {
          summary: 'Invalid time format',
          value: {
            statusCode: 400,
            message:
              'Invalid start time format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'End time must be after start time',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You can only create shifts for your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create shifts for your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Shift number already exists',
    schema: {
      example: {
        statusCode: 409,
        message: "Shift number 'SHIFT-001' already exists for merchant 1",
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: CreateShiftDto,
    description: 'Shift creation data',
    examples: {
      example1: {
        summary: 'Basic shift',
        description: 'A simple shift with start and end time',
        value: {
          merchantId: 1,
          number: 'SHIFT-001',
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter',
          status: 'active',
        },
      },
      example2: {
        summary: 'Shift without end time',
        description: 'A shift that is still ongoing',
        value: {
          merchantId: 1,
          number: 'SHIFT-002',
          startTime: '2024-01-15T08:00:00Z',
          role: 'cook',
          status: 'active',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateShiftDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneShiftResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create shifts',
      );
    }

    return this.shiftsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all shifts',
    description:
      "Retrieves all shifts for the authenticated user's merchant with filtering, sorting, and pagination support. Only users with any merchant role can access this endpoint.",
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: [
      'waiter',
      'cook',
      'bartender',
      'host',
      'cashier',
      'manager',
      'busser',
      'delivery',
    ],
    description: 'Filter by shift role',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'completed', 'cancelled', 'deleted'],
    description: 'Filter by shift status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter shifts from this date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter shifts until this date (YYYY-MM-DD format)',
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
    description: 'Number of items per page (minimum 1, maximum 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['startTime', 'endTime', 'role', 'status'],
    description: 'Field to sort by',
    example: 'startTime',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description: 'List of shifts retrieved successfully with pagination',
    type: PaginatedShiftsResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shifts retrieved successfully',
        data: [
          {
            id: 1,
            merchantId: 1,
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
            role: 'waiter',
            status: 'active',
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
          },
          {
            id: 2,
            merchantId: 1,
            startTime: '2024-01-15T08:00:00Z',
            endTime: '2024-01-15T16:00:00Z',
            role: 'cook',
            status: 'completed',
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: false,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view shifts',
    schema: {
      example: {
        statusCode: 403,
        message: 'User must be associated with a merchant to view shifts',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or filter parameters',
    schema: {
      examples: {
        invalidDateFormat: {
          summary: 'Invalid date format',
          value: {
            statusCode: 400,
            message: 'Invalid startDate format. Please use YYYY-MM-DD format',
            error: 'Bad Request',
          },
        },
        invalidDateRange: {
          summary: 'Invalid date range',
          value: {
            statusCode: 400,
            message: 'startDate must be before or equal to endDate',
            error: 'Bad Request',
          },
        },
        invalidPagination: {
          summary: 'Invalid pagination parameters',
          value: {
            statusCode: 400,
            message: 'page must be a positive number',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async findAll(
    @Query() query: GetShiftsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<PaginatedShiftsResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shifts',
      );
    }

    return this.shiftsService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a shift by ID',
    description:
      'Retrieves a specific shift by its ID. Only users with any merchant role can access this endpoint. Users can only access shifts from their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift found successfully',
    type: OneShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift retrieved successfully',
        data: {
          id: 1,
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter',
          status: 'active',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant or can only view shifts from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message: 'User must be associated with a merchant to view shifts',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to access shift from different merchant',
          value: {
            statusCode: 403,
            message: 'You can only view shifts from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift or merchant not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid shift ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift ID',
            error: 'Bad Request',
          },
        },
        negativeId: {
          summary: 'Negative or zero ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift ID',
            error: 'Bad Request',
          },
        },
        nonNumericId: {
          summary: 'Non-numeric ID',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneShiftResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view shifts',
      );
    }

    return this.shiftsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a shift by ID',
    description:
      "Updates an existing shift for the authenticated user's merchant. Only merchant administrators can update shifts. The merchant value cannot be modified. All fields are optional. End time must be after start time if provided.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift updated successfully',
    type: OneShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift updated successfully',
        data: {
          id: 1,
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          endTime: '18:00',
          role: 'waiter',
          status: 'active',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant or can only update shifts from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message: 'User must be associated with a merchant to update shifts',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to update shift from different merchant',
          value: {
            statusCode: 403,
            message: 'You can only update shifts from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Shift 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data, ID format, or business rule violation',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Invalid shift ID',
            error: 'Bad Request',
          },
        },
        noFields: {
          summary: 'No fields provided for update',
          value: {
            statusCode: 400,
            message: 'At least one field must be provided for update',
            error: 'Bad Request',
          },
        },
        invalidTimeFormat: {
          summary: 'Invalid time format',
          value: {
            statusCode: 400,
            message:
              'Invalid start time format. Please provide a valid date string',
            error: 'Bad Request',
          },
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'End time must be after start time',
            error: 'Bad Request',
          },
        },
        invalidEnum: {
          summary: 'Invalid enum value',
          value: {
            statusCode: 400,
            message: 'role must be a valid enum value',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiBody({
    type: UpdateShiftDto,
    description:
      'Shift update data (all fields optional, merchantId cannot be modified)',
    examples: {
      example1: {
        summary: 'Update end time only',
        description: 'Update only the end time of a shift',
        value: {
          endTime: '2024-01-15T18:00:00Z',
        },
      },
      example2: {
        summary: 'Update multiple fields',
        description: 'Update start time, end time, role and status',
        value: {
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T17:00:00Z',
          role: 'cook',
          status: 'active',
        },
      },
      example3: {
        summary: 'Remove end time',
        description: 'Set end time to null (ongoing shift)',
        value: {
          endTime: null,
        },
      },
      example4: {
        summary: 'Update role only',
        description: 'Change only the role of the shift',
        value: {
          role: 'bartender',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneShiftResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update shifts',
      );
    }

    return this.shiftsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
    Scope.ADMIN_PORTAL,
  )
  @ApiOperation({
    summary: 'Delete a shift by ID',
    description:
      'Deletes a specific shift by its ID. Only merchant administrators can delete shifts from their own merchant. This is a logical delete operation (changes status to DELETED). Cannot delete shifts with active assignments.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Shift ID to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Shift deleted successfully',
    type: OneShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Shift deleted successfully',
        data: {
          id: 1,
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter',
          status: 'deleted',
          merchant: {
            id: 1,
            name: 'Restaurant ABC',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant or can only delete shifts from their own merchant',
    schema: {
      examples: {
        noMerchant: {
          summary: 'User not associated with merchant',
          value: {
            statusCode: 403,
            message: 'User must be associated with a merchant to delete shifts',
            error: 'Forbidden',
          },
        },
        differentMerchant: {
          summary: 'Trying to delete shift from different merchant',
          value: {
            statusCode: 403,
            message: 'You can only delete shifts from your own merchant',
            error: 'Forbidden',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Shift or merchant not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or value',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid shift ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift ID',
            error: 'Bad Request',
          },
        },
        negativeId: {
          summary: 'Negative or zero ID',
          value: {
            statusCode: 400,
            message: 'Invalid shift ID',
            error: 'Bad Request',
          },
        },
        nonNumericId: {
          summary: 'Non-numeric ID',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot delete shift with active assignments',
    schema: {
      example: {
        statusCode: 409,
        message:
          'Cannot delete shift. There are 3 active shift assignment(s) associated with this shift. Please remove the assignments first.',
        error: 'Conflict',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ): Promise<OneShiftResponseDto> {
    const authenticatedUser = req.user as AuthenticatedUser | undefined;
    const authenticatedUserMerchantId = authenticatedUser?.merchant?.id;

    // Validate that the user has a merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete shifts',
      );
    }

    return this.shiftsService.remove(id, authenticatedUserMerchantId);
  }
}
