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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoyaltyRewardsRedemptionsService } from './loyalty-rewards-redemptions.service';
import { CreateLoyaltyRewardsRedemptionDto } from './dto/create-loyalty-rewards-redemption.dto';
import { UpdateLoyaltyRewardsRedemptionDto } from './dto/update-loyalty-rewards-redemption.dto';
import { GetLoyaltyRewardsRedemptionsQueryDto } from './dto/get-loyalty-rewards-redemptions-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { AllPaginatedLoyaltyRewardsRedemptionDto } from './dto/all-paginated-loyalty-rewards-redemption.dto';
import { OneLoyaltyRewardsRedemptionResponse } from './dto/loyalty-rewards-redemption-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Rewards Redemptions')
@Controller('loyalty-rewards-redemptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyRewardsRedemptionsController {
  constructor(
    private readonly loyaltyRewardsRedemptionsService: LoyaltyRewardsRedemptionsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Rewards Redemption' })
  @ApiCreatedResponse({
    description: 'Loyalty Rewards Redemption created successfully',
    type: OneLoyaltyRewardsRedemptionResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: [
          'loyalty_customer_id must be an integer',
          'reward_id must be an integer',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Redemption conflict',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiBody({ type: CreateLoyaltyRewardsRedemptionDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    createLoyaltyRewardsRedemptionDto: CreateLoyaltyRewardsRedemptionDto,
  ): Promise<OneLoyaltyRewardsRedemptionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardsRedemptionsService.create(
      merchantId,
      createLoyaltyRewardsRedemptionDto,
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
    summary: 'Get all loyalty rewards redemptions with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty rewards redemptions with optional filters.',
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
    name: 'min_redeemed_points',
    required: false,
    type: Number,
    description: 'Filter redemptions by minimum points',
    example: 100,
  })
  @ApiQuery({
    name: 'max_redeemed_points',
    required: false,
    type: Number,
    description: 'Filter redemptions by maximum points',
    example: 500,
  })
  @ApiOkResponse({
    description:
      'Paginated list of loyalty rewards redemptions retrieved successfully',
    type: AllPaginatedLoyaltyRewardsRedemptionDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyRewardsRedemptionsQueryDto,
  ): Promise<AllPaginatedLoyaltyRewardsRedemptionDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardsRedemptionsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Rewards Redemption by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Redemption ID' })
  @ApiOkResponse({
    description: 'Loyalty Rewards Redemption found',
    type: OneLoyaltyRewardsRedemptionResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Rewards Redemption not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyRewardsRedemptionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardsRedemptionsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Rewards Redemption' })
  @ApiParam({ name: 'id', type: Number, description: 'Redemption ID' })
  @ApiBody({ type: UpdateLoyaltyRewardsRedemptionDto })
  @ApiOkResponse({
    description: 'Loyalty Rewards Redemption updated successfully',
    type: OneLoyaltyRewardsRedemptionResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Rewards Redemption not found',
    type: ErrorResponse,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateLoyaltyRewardsRedemptionDto: UpdateLoyaltyRewardsRedemptionDto,
  ): Promise<OneLoyaltyRewardsRedemptionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardsRedemptionsService.update(
      id,
      merchantId,
      updateLoyaltyRewardsRedemptionDto,
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
  @ApiOperation({ summary: 'Delete a Loyalty Rewards Redemption' })
  @ApiParam({ name: 'id', type: Number, description: 'Redemption ID' })
  @ApiOkResponse({
    description: 'Loyalty Rewards Redemption deleted successfully',
    type: OneLoyaltyRewardsRedemptionResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Rewards Redemption not found',
    type: ErrorResponse,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyRewardsRedemptionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardsRedemptionsService.remove(id, merchantId);
  }
}
