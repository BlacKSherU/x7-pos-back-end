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
import { LoyaltyRewardService } from './loyalty-reward.service';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { GetLoyaltyRewardQueryDto } from './dto/get-loyalty-reward-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { AllPaginatedLoyaltyRewardDto } from './dto/all-paginated-loyalty-reward.dto';
import { OneLoyaltyRewardResponse } from './dto/loyalty-reward-response.dto';
import { LoyaltyRewardType } from './constants/loyalty-reward-type.enum';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Rewards')
@Controller('loyalty-rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyRewardController {
  constructor(private readonly loyaltyRewardService: LoyaltyRewardService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Reward' })
  @ApiCreatedResponse({
    description: 'Loyalty Reward created successfully',
    type: OneLoyaltyRewardResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be a string', 'cost_points must be a number'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Loyalty Reward already exists',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiBody({ type: CreateLoyaltyRewardDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyRewardDto: CreateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardService.create(merchantId, createLoyaltyRewardDto);
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
    summary: 'Get all loyalty rewards with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty rewards with optional filters. Users can only see loyalty rewards from their own merchant.',
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
    name: 'name',
    required: false,
    type: String,
    description: 'Filter rewards by name',
    example: 'Free Coffee',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: LoyaltyRewardType,
    description: 'Filter rewards by type',
    example: LoyaltyRewardType.FREE_ITEM,
  })
  @ApiOkResponse({
    description: 'Paginated list of loyalty rewards retrieved successfully',
    type: AllPaginatedLoyaltyRewardDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty rewards retrieved successfully',
        data: [
          {
            id: 1,
            type: 'FREE_ITEM',
            name: 'Free Large Coffee',
            description: 'Get any large coffee for free with 100 points.',
            cost_points: 100,
            discount_value: null,
            cashback_value: null,
            created_at: '2025-12-30T17:50:12.000Z',
            updated_at: '2025-12-30T17:50:12.000Z',
            loyalty_program: { id: 1, name: 'Main Program' },
            free_product: { id: 123, name: 'Large Coffee' },
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
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
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
    schema: {
      examples: {
        invalidPage: {
          summary: 'Invalid page number',
          value: {
            statusCode: 400,
            message: 'page must not be less than 1',
            error: 'Bad Request',
          },
        },
        invalidLimit: {
          summary: 'Invalid limit',
          value: {
            statusCode: 400,
            message: 'limit must not be greater than 100',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyRewardQueryDto,
  ): Promise<AllPaginatedLoyaltyRewardDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Reward by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Reward ID' })
  @ApiOkResponse({
    description: 'Loyalty Reward found',
    type: OneLoyaltyRewardResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Reward not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Reward not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyRewardResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Reward' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Reward ID' })
  @ApiBody({ type: UpdateLoyaltyRewardDto })
  @ApiOkResponse({
    description: 'Loyalty Reward updated successfully',
    type: OneLoyaltyRewardResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Reward not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Reward not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'name must be a string',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLoyaltyRewardDto: UpdateLoyaltyRewardDto,
  ): Promise<OneLoyaltyRewardResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardService.update(
      id,
      merchantId,
      updateLoyaltyRewardDto,
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
  @ApiOperation({ summary: 'Delete a Loyalty Reward' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Reward ID' })
  @ApiOkResponse({
    description: 'Loyalty Reward deleted successfully',
    type: OneLoyaltyRewardResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Reward not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Reward not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyRewardResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyRewardService.remove(id, merchantId);
  }
}
