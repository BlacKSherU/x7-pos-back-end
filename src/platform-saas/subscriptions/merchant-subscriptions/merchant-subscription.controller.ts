//src/subscriptions/merchant-subscriptions/merchant-subscription.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  Param,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { MerchantSubscriptionService } from './merchant-subscription.service';
import { CreateMerchantSubscriptionDto } from './dtos/create-merchant-subscription.dto';
import {
  MerchantSubscriptionSummaryDto,
  OneMerchantSubscriptionSummaryDto,
} from './dtos/merchant-subscription-summary.dto';
import {
  ApiTags,
  ApiNotFoundResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { UpdateMerchantSubscriptionDto } from './dtos/update-merchant-subscription.dto';
import { PaginatedMerchantSubscriptionResponseDto } from './dtos/paginated-merchant-subscription-response.dto';
import { QueryMerchantSubscriptionDto } from './dtos/query-merchant-subscription.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { merchantScopeOf } from 'src/common/utils/merchant-scope.util';

@ApiTags('Platform SaaS - Subscriptions - Merchant Subscriptions')
@ApiBearerAuth()
@Controller('merchant-subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantSubscriptionController {
  constructor(
    private readonly merchantSubscriptionService: MerchantSubscriptionService,
  ) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Merchant Subscription',
    description:
      'Endpoint for creating a new Merchant Subscription in the system.',
  })
  @ApiBody({
    type: CreateMerchantSubscriptionDto,
    description: 'Require Data for a new Merchant Subscription',
  })
  @ApiCreatedResponse({
    description: 'The Merchant Subscription has been successfully created',
    type: MerchantSubscriptionSummaryDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        plan: { id: 2, name: 'Gold Plan' },
        startDate: '2025-10-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        renewalDate: '2026-09-25T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'credit_card',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'merchantId must be a number',
          'planId must be a number',
          'startDate must be a Date instance',
          'status must be one of the following values: active, inactive',
          'paymentMethod must be a string',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async create(
    @Body() dto: CreateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.create(dto);
  }
  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get All Merchant Subscriptions',
    description: 'Endpoint for get ALL of the Merchant Subscription.',
  })
  @ApiOkResponse({
    description: 'Paginated list of merchant subscriptions',
    type: PaginatedMerchantSubscriptionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findAll(
    @Query() query: QueryMerchantSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedMerchantSubscriptionResponseDto> {
    return this.merchantSubscriptionService.findAll(
      query,
      merchantScopeOf(user),
    );
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get a Merchant Subscription by ID',
    description:
      'Endpoint to retrieve a specific Merchant Subscription using its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Subscription retrieved successfully',
    type: MerchantSubscriptionSummaryDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        plan: { id: 2, name: 'Gold Plan' },
        startDate: '2025-10-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        renewalDate: '2026-09-25T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'credit_card',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID. Must be a positive number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Merchant Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Subscription not found',
        error: 'Not Found',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const merchantSubscription = await this.merchantSubscriptionService.findOne(
      id,
      merchantScopeOf(user),
    );
    return merchantSubscription;
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update a Merchant Subscription',
    description:
      'Endpoint to update an existing Merchant Subscription by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateMerchantSubscriptionDto,
    description: 'Data for updating the Merchant Subscription',
  })
  @ApiOkResponse({
    description: 'Merchant Subscription updated successfully',
    type: MerchantSubscriptionSummaryDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        plan: { id: 2, name: 'Gold Plan' },
        startDate: '2025-10-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        renewalDate: '2026-09-25T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'credit_card',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format or input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Invalid ID. Must be a positive number.',
          'startDate must be a Date instance',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Merchant Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Subscription not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.update(id, dto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Delete a Merchant Subscription',
    description:
      'Endpoint to delete an existing Merchant Subscription by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Subscription deleted successfully',
    type: MerchantSubscriptionSummaryDto,
    schema: {
      example: {
        id: 1,
        merchant: { id: 5, name: 'Acme Corp' },
        plan: { id: 2, name: 'Gold Plan' },
        startDate: '2025-10-01T00:00:00.000Z',
        endDate: '2026-10-01T00:00:00.000Z',
        renewalDate: '2026-09-25T00:00:00.000Z',
        status: 'active',
        paymentMethod: 'credit_card',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID. Must be a positive number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Merchant Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Subscription not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.remove(id);
  }
}
