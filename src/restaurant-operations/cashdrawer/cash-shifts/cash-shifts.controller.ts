import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CashShiftsService } from './cash-shifts.service';
import { CreateCashShiftDto } from './dto/create-cash-shift.dto';
import { CloseCashShiftDto } from './dto/close-cash-shift.dto';
import { ManualCashTransactionDto } from './dto/manual-cash-transaction.dto';
import {
  CashShiftResponseDto,
  OneCashShiftResponseDto,
  AllCashShiftsResponseDto,
} from './dto/cash-shift-response.dto';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { FeatureAccessGuard } from '../../../auth/guards/feature-access.guard';
import { RequireFeature } from '../../../auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from '../../../common/subscription/subscription-feature-ids';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@ApiExtraModels(
  ErrorResponse,
  CreateCashShiftDto,
  CloseCashShiftDto,
  ManualCashTransactionDto,
  CashShiftResponseDto,
  OneCashShiftResponseDto,
  AllCashShiftsResponseDto,
)
@ApiTags('Restaurant operations - Cashdrawer - Cash Shifts')
@ApiBearerAuth()
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_DRAWERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('cash-shifts')
export class CashShiftsController {
  constructor(private readonly cashShiftsService: CashShiftsService) {}

  @ApiOperation({
    summary: 'Open a new cash shift',
    description:
      'Opens a new cash shift for a specified cash drawer with an initial float/opening balance.',
  })
  @ApiBody({
    type: CreateCashShiftDto,
    examples: {
      default: {
        summary: 'Cash shift opening request',
        value: {
          cashDrawerId: 1,
          openingBalance: 1000.0,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Cash shift opened successfully',
    type: OneCashShiftResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Cash shift opened successfully',
        data: {
          id: 42,
          merchantId: 10,
          cashDrawerId: 1,
          openedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          closedByCollaborator: null,
          openingBalance: 1000.0,
          systemAmount: null,
          declaredAmount: null,
          difference: null,
          status: 'OPEN',
          openedAt: '2026-09-30T08:00:00.000Z',
          closedAt: null,
          totalExpenses: 0,
          expenses: [],
          manualInflows: [],
          totalManualInflows: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request - Invalid input data or cash drawer not in OPEN status',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: [
          'cashDrawerId must be a positive integer',
          'openingBalance must not be less than 0',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Conflict - Cash Drawer already has an active open shift',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message:
          'Cash Drawer #1 already has an active shift session (#CS-42) in progress. Please close the active shift before opening a new one.',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 412,
    description:
      'Precondition Failed - User account is not linked to any collaborator record or cash drawer is not OPEN',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 412,
        message:
          'Precondition Failed: The cash drawer must be in OPEN status to open a cash shift',
        error: 'Precondition Failed',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Post()
  openShift(
    @Body() dto: CreateCashShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashShiftsService.openShift(dto, user);
  }

  @ApiOperation({
    summary: 'List all cash shifts',
    description:
      'Retrieves all cash shift records for the authenticated merchant, including open and closed shifts.',
  })
  @ApiOkResponse({
    description: 'List of cash shifts retrieved successfully',
    type: AllCashShiftsResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Cash shifts retrieved successfully',
        data: [
          {
            id: 42,
            merchantId: 10,
            cashDrawerId: 1,
            openedByCollaborator: {
              id: 5,
              name: 'Juan Pérez',
              role: 'Cajero',
            },
            closedByCollaborator: null,
            openingBalance: 1000.0,
            systemAmount: 1450.5,
            declaredAmount: null,
            difference: null,
            status: 'OPEN',
            openedAt: '2026-09-30T08:00:00.000Z',
            closedAt: null,
            totalExpenses: 25.5,
            expenses: [
              {
                id: 101,
                shiftId: 42,
                amount: 25.5,
                reason: 'Insumos de oficina',
                receiptPhoto: null,
                userId: 5,
                type: 'OUTFLOW',
                createdAt: '2026-09-30T10:15:00.000Z',
              },
            ],
            manualInflows: [],
            totalManualInflows: 0,
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.cashShiftsService.findAll(user.merchant.id, query);
  }

  @ApiOperation({
    summary: 'Get the active cash shift for the merchant',
    description:
      'Retrieves the active OPEN cash shift for the authenticated merchant with calculated live theoretical balance and sales summary.',
  })
  @ApiOkResponse({
    description: 'Active cash shift found successfully',
    type: OneCashShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Active cash shift found',
        data: {
          id: 42,
          merchantId: 10,
          cashDrawerId: 1,
          openedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          closedByCollaborator: null,
          openingBalance: 1000.0,
          systemAmount: 1475.5,
          declaredAmount: null,
          difference: null,
          status: 'OPEN',
          openedAt: '2026-09-30T08:00:00.000Z',
          closedAt: null,
          salesSummary: [{ method: 'CASH', amount: 500.0 }],
          totalExpenses: 24.5,
          expenses: [],
          manualInflows: [],
          totalManualInflows: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid query parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No active cash shift found for this merchant',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'No active cash shift found for this merchant',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 412,
    description:
      'Precondition Failed - No active shift session available for merchant operations',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 412,
        message:
          'Precondition Failed: Active cash shift required for operation',
        error: 'Precondition Failed',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Get('active')
  findActive(@CurrentUser() user: AuthenticatedUser) {
    return this.cashShiftsService.findActiveShift(user.merchant.id);
  }

  @ApiOperation({
    summary: 'Get a cash shift by ID',
    description:
      'Retrieves detailed information for a specific cash shift by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the cash shift',
    example: 42,
  })
  @ApiOkResponse({
    description: 'Cash shift retrieved successfully',
    type: OneCashShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Cash shift retrieved successfully',
        data: {
          id: 42,
          merchantId: 10,
          cashDrawerId: 1,
          openedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          closedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          openingBalance: 1000.0,
          systemAmount: 1475.5,
          declaredAmount: 1475.5,
          difference: 0.0,
          status: 'CLOSED',
          openedAt: '2026-09-30T08:00:00.000Z',
          closedAt: '2026-09-30T17:00:00.000Z',
          salesSummary: [{ method: 'CASH', amount: 500.0 }],
          totalExpenses: 24.5,
          expenses: [],
          manualInflows: [],
          totalManualInflows: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid shift ID parameter',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash shift not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Cash shift with ID 42 not found',
        error: 'Not Found',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashShiftsService.findOne(id, user.merchant.id);
  }

  @ApiOperation({
    summary: 'Close a cash shift',
    description:
      'The backend calculates the systemAmount (system balance), the difference (declaredAmount - systemAmount), and registers the closing. The closing collaborator is resolved automatically from the authenticated session; the frontend only sends declaredAmount.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the cash shift to close',
    example: 42,
  })
  @ApiBody({
    type: CloseCashShiftDto,
    examples: {
      default: {
        summary: 'Cash shift closing request',
        value: {
          declaredAmount: 1480.0,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Cash shift closed successfully with shift summary',
    type: OneCashShiftResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Cash shift closed successfully',
        data: {
          id: 42,
          merchantId: 10,
          cashDrawerId: 1,
          openedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          closedByCollaborator: {
            id: 5,
            name: 'Juan Pérez',
            role: 'Cajero',
          },
          openingBalance: 1000.0,
          systemAmount: 1475.5,
          declaredAmount: 1480.0,
          difference: 4.5,
          status: 'DISCREPANCY',
          openedAt: '2026-09-30T08:00:00.000Z',
          closedAt: '2026-09-30T17:00:00.000Z',
          salesSummary: [{ method: 'CASH', amount: 500.0 }],
          totalExpenses: 24.5,
          expenses: [],
          manualInflows: [],
          totalManualInflows: 0,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'The cash shift is not in OPEN status',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message:
          'The cash shift is already closed. Only OPEN cash shifts can be closed.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash shift not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Cash shift with ID 42 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 412,
    description:
      'Precondition Failed - Shift is not in valid OPEN state for closing',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 412,
        message:
          'Precondition Failed: Cash shift #42 is not open or has unverified transactions',
        error: 'Precondition Failed',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Post(':id/close')
  closeShift(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseCashShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashShiftsService.closeShift(id, dto, user);
  }

  @ApiOperation({
    summary: 'Add a manual cash transaction (Income/Expense)',
    description:
      'Allows registering cash withdrawals (outflows for suppliers) or cash inflows in the open shift. Outflows cannot exceed the available cash in the till.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the open cash shift',
    example: 42,
  })
  @ApiBody({
    type: ManualCashTransactionDto,
    examples: {
      default: {
        summary: 'Manual cash transaction creation request',
        value: {
          amount: 50.0,
          type: 'OUT',
          reason: 'Pago a proveedor de bebidas',
          collaboratorId: 5,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Manual transaction registered successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Manual transaction registered successfully',
        data: {
          id: 105,
          shiftId: 42,
          amount: 50.0,
          type: 'OUT',
          reason: 'Pago a proveedor de bebidas',
          collaboratorId: 5,
          createdAt: '2026-09-30T14:20:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient funds or cash shift is closed',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message:
          'Cannot process OUT flow of 50.0. The till only has 20.0 available.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Cash shift or collaborator not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message:
          'Collaborator with ID 5 not found or does not belong to your merchant',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 412,
    description:
      'Precondition Failed - Active open cash shift required to add transactions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 412,
        message:
          'Precondition Failed: Active open cash shift required to add manual transaction',
        error: 'Precondition Failed',
      },
    },
  })
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Post(':id/transactions/manual')
  addManualTransaction(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualCashTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashShiftsService.addManualTransaction(
      id,
      dto,
      user.merchant.id,
    );
  }
}
