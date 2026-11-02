import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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

import { TipSettlementsService } from './tip-settlements.service';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
import { TipPayoutDto } from './dto/tip-payout.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import {
  OneTipSettlementResponseDto,
  PaginatedTipSettlementResponseDto,
} from './dto/tip-settlement-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { SettlementMethod } from './constants/settlement-method.enum';
import {
  GetTipSettlementQueryDto,
  TipSettlementSortBy,
} from './dto/get-tip-settlement-query.dto';
import { QueryTipSettlementReportDto } from './dto/query-tip-settlement-report.dto';
import { LiquidatedTipSettlementsDto } from './dto/liquidated-tip-settlement.dto';

@ApiExtraModels(
  ErrorResponse,
  CreateTipSettlementDto,
  UpdateTipSettlementDto,
  OneTipSettlementResponseDto,
  PaginatedTipSettlementResponseDto,
  TipPayoutDto,
  QueryTipSettlementReportDto,
  LiquidatedTipSettlementsDto,
)
@ApiTags('Restaurant operations - Tips - Tip Settlements')
@ApiBearerAuth()
@Controller('tip-settlements')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.TIP_SETTLEMENTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class TipSettlementsController {
  constructor(private readonly tipSettlementsService: TipSettlementsService) {}

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
    summary: 'Create a new Tip Settlement',
    description:
      "Creates a new tip settlement. Collaborator and shift must belong to the authenticated user's merchant.",
  })
  @ApiCreatedResponse({
    description: 'Tip settlement created successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or amount',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Collaborator, shift, or user not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateTipSettlementDto,
    description: 'Tip settlement creation data',
    examples: {
      example1: {
        summary: 'Create settlement (cash)',
        value: {
          collaboratorId: 1,
          shiftId: 1,
          totalAmount: 150.75,
          settlementMethod: SettlementMethod.CASH,
          settledBy: 1,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateTipSettlementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = user.merchant?.id;
    return this.tipSettlementsService.create(dto, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Get all Tip Settlements with pagination and filters',
    description:
      "Retrieves a paginated list of tip settlements for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'collaboratorId', required: false, type: Number })
  @ApiQuery({ name: 'shiftId', required: false, type: Number })
  @ApiQuery({
    name: 'settlementMethod',
    required: false,
    enum: SettlementMethod,
  })
  @ApiQuery({
    name: 'settledDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: TipSettlementSortBy,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of tip settlements',
    type: PaginatedTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetTipSettlementQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = user.merchant?.id;
    return this.tipSettlementsService.findAll(
      query,
      authenticatedUserMerchantId,
    );
  }

  @Get('report')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Generate tip settlement analytical report',
    description:
      'Provides aggregated tip totals (cash vs card/transfer) and a list of tip settlements matching query parameters.',
  })
  @ApiQuery({ name: 'collaboratorId', required: false, type: Number })
  @ApiQuery({ name: 'shiftId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiOkResponse({
    description: 'Tip settlement report generated successfully',
    schema: {
      example: {
        totalCashTips: 450.0,
        totalCardTips: 320.5,
        totalTips: 770.5,
        settlements: [
          {
            id: 10,
            company_id: 1,
            merchant_id: 10,
            collaborator_id: 5,
            shift_id: 3,
            total_amount: 150.0,
            settlement_method: 'CASH',
            status: 'LIQUIDATED',
            settled_by: 12,
            settled_at: '2026-10-01T10:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid query parameters',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid status parameter',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
    description: 'Merchant or resource not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
        error: 'Not Found',
      },
    },
  })
  getSettlementReport(
    @Query() query: QueryTipSettlementReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipSettlementsService.getSettlementReport(query, user);
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
  @ApiOperation({
    summary: 'Get a Tip Settlement by ID',
    description:
      'Retrieves a specific tip settlement. Users can only access settlements from their merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip settlement ID' })
  @ApiOkResponse({
    description: 'Tip settlement found successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = user.merchant?.id;
    return this.tipSettlementsService.findOne(id, authenticatedUserMerchantId);
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
  @ApiOperation({
    summary: 'Update a Tip Settlement by ID',
    description: 'Updates an existing tip settlement. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Tip settlement ID to update',
  })
  @ApiOkResponse({
    description: 'Tip settlement updated successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateTipSettlementDto,
    description: 'Tip settlement update data (all fields optional)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipSettlementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = user.merchant?.id;
    return this.tipSettlementsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
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
    summary: 'Delete a Tip Settlement by ID',
    description: 'Permanently deletes a tip settlement.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Tip settlement ID to delete',
  })
  @ApiOkResponse({
    description: 'Tip settlement deleted successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = user.merchant?.id;
    return this.tipSettlementsService.remove(id, authenticatedUserMerchantId);
  }

  @Patch('liquidated')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update status of multiple tip settlements to LIQUIDATED',
    description:
      'Batch updates specified tip settlements to LIQUIDATED status and registers settlement timestamp and admin user.',
  })
  @ApiBody({
    type: LiquidatedTipSettlementsDto,
    description: 'List of tip settlement IDs to liquidate',
    examples: {
      default: {
        summary: 'Liquidate tip settlements request',
        value: {
          settlementIds: [10, 11, 12],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tip settlements liquidated successfully',
    schema: {
      example: {
        success: true,
        message: 'Tip settlements liquidated successfully',
        data: [
          {
            id: 10,
            company_id: 1,
            merchant_id: 10,
            collaborator_id: 5,
            shift_id: 3,
            total_amount: 75.25,
            settlement_method: 'CASH',
            status: 'LIQUIDATED',
            settled_by: 12,
            settled_at: '2026-10-01T11:30:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid settlement IDs array',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['settlementIds must be an array'],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
    description: 'No tip settlements found matching provided IDs',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'No settlements found',
        error: 'Not Found',
      },
    },
  })
  async liquidatedTipSettlements(
    @Body() dto: LiquidatedTipSettlementsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipSettlementsService.liquidatedTipSettlements(dto, user);
  }

  @Post('cash-shifts/:shiftId/payout')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Process the payout of cash tips collected during the shift to staff',
    description:
      'Validates distribution according to the active TipRule (POOL, ROLE_BASED), creates settlements in tip_settlements, updates tip status to PAID_OUT, and deducts the total from the current_balance of the cash drawer.',
  })
  @ApiParam({
    name: 'shiftId',
    type: Number,
    description: 'Active cash shift ID',
    example: 42,
  })
  @ApiBody({
    type: TipPayoutDto,
    description: 'Tip payout distribution array',
    examples: {
      default: {
        summary: 'Process tip payout request',
        value: {
          payments: [
            { collaboratorId: 5, amount: 75.25 },
            { collaboratorId: 8, amount: 75.25 },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Tip payout registered successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Tips paid out successfully',
        data: {
          receiptId: 'REC-TIP-42-1711886400000',
          shiftId: 42,
          totalPaid: 150.5,
          paymentDate: '2026-10-01T11:30:00.000Z',
          settledBy: 12,
          details: [
            {
              collaboratorId: 5,
              collaboratorName: 'Juan Pérez',
              role: 'WAITER',
              amount: 75.25,
            },
            {
              collaboratorId: 8,
              collaboratorName: 'María Gómez',
              role: 'WAITER',
              amount: 75.25,
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Amount exceeds collected tips, shift closed, or incorrect distribution',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message:
          'Cannot payout 150.5 in tips. The shift register only has 100.0 available in cash.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
    description: 'Cash drawer or shift not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Cash drawer associated with this shift not found',
        error: 'Not Found',
      },
    },
  })
  async payoutTips(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() dto: TipPayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipSettlementsService.payoutTips(
      shiftId,
      dto,
      user.id,
      user.merchant.id,
    );
  }

  @Get('cash-shifts/:shiftId/collected-tips')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Get the total cash tips collected during the shift that are pending payout',
    description:
      'Retrieves the sum and count of cash tips in COLLECTED status for the given shift.',
  })
  @ApiParam({
    name: 'shiftId',
    type: Number,
    description: 'Cash shift ID',
    example: 42,
  })
  @ApiOkResponse({
    description: 'Collected tips summary retrieved successfully',
    schema: {
      example: {
        shiftId: 42,
        totalTipsCollected: 150.5,
        tipsCount: 8,
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
    description: 'Unauthorized - Invalid or missing authentication token',
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
  async getCollectedTips(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tipSettlementsService.getCollectedTipsSummary(
      shiftId,
      user.merchant.id,
    );
  }
}
