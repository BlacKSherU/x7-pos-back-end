import {
  Controller,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { FeatureAccessGuard } from '../../../auth/guards/feature-access.guard';
import { RequireFeature } from '../../../auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from '../../../common/subscription/subscription-feature-ids';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { CashMovementsService } from './cash-movements.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashMovementResponseDto } from './dto/cash-movement-response.dto';

@ApiExtraModels(ErrorResponse, CashMovementResponseDto, CreateCashMovementDto)
@ApiTags('Restaurant operations - Cashdrawer - Cash Movements')
@ApiBearerAuth()
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_DRAWERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('cash-shifts')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @ApiOperation({
    summary: 'Record an expense (cash withdrawal) from the cash register',
    description:
      'Allows recording cash withdrawals from the drawer for minor or urgent expenses in an OPEN shift. The expense amount cannot exceed the available balance.',
  })
  @ApiParam({
    name: 'shiftId',
    type: Number,
    description: 'Unique identifier of the active cash shift',
    example: 42,
  })
  @ApiBody({ type: CreateCashMovementDto })
  @ApiCreatedResponse({
    description: 'Expense recorded successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Expense recorded successfully',
        data: {
          id: 101,
          shiftId: 42,
          amount: 25.5,
          reason: 'Office supplies and paper purchase for register',
          receiptPhoto: 'https://storage.example.com/receipts/rec-101.jpg',
          userId: 7,
          type: 'OUTFLOW',
          createdAt: '2024-01-15T14:30:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Insufficient funds or shift closed',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Insufficient funds in till for this expense',
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
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
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
  @Post(':shiftId/expenses')
  recordExpense(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.recordExpense(
      shiftId,
      dto,
      user.id,
      user.merchant.id,
    );
  }

  @ApiOperation({
    summary:
      'Record a manual cash inflow to the cash register (e.g. change, adjustment)',
    description:
      'Allows recording manual cash inflows that are not from sales into the active shift. Sums the amount to the cash drawer current balance and notifies the admins.',
  })
  @ApiParam({
    name: 'shiftId',
    type: Number,
    description: 'Unique identifier of the active cash shift',
    example: 42,
  })
  @ApiBody({ type: CreateCashMovementDto })
  @ApiCreatedResponse({
    description: 'Manual cash inflow recorded successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Cash inflow recorded successfully',
        data: {
          id: 103,
          shiftId: 42,
          amount: 100.0,
          reason: 'Till change float replenishment',
          receiptPhoto: null,
          userId: 7,
          type: 'INFLOW',
          createdAt: '2024-01-15T15:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Shift is closed or invalid input',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot add cash inflow to closed shift',
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
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
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
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @Post(':shiftId/inflows')
  recordInflow(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.recordInflow(
      shiftId,
      dto,
      user.id,
      user.merchant.id,
    );
  }

  @ApiOperation({
    summary: 'Get cash drawer movements for the shift',
    description:
      'Detailed list of cash movements (expenses/withdrawals and inflows) recorded during the shift.',
  })
  @ApiParam({
    name: 'shiftId',
    type: Number,
    description: 'Unique identifier of the cash shift',
    example: 42,
  })
  @ApiOkResponse({
    description: 'Movements retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        data: [
          {
            id: 101,
            shiftId: 42,
            amount: 25.5,
            reason: 'Office supplies and paper purchase for register',
            receiptPhoto: 'https://storage.example.com/receipts/rec-101.jpg',
            userId: 7,
            type: 'OUTFLOW',
            createdAt: '2024-01-15T14:30:00.000Z',
          },
          {
            id: 102,
            shiftId: 42,
            amount: 15.0,
            reason: 'Emergency ice delivery for bar',
            receiptPhoto: null,
            userId: 7,
            type: 'OUTFLOW',
            createdAt: '2024-01-15T16:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid shift ID parameter',
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
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message:
          'You can only view movements for shifts belonging to your merchant',
        error: 'Forbidden',
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
  @Get(':shiftId/expenses')
  getExpenses(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.findByShift(shiftId, user.merchant.id);
  }
}
