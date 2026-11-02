// src/subscriptions/subscription-payments/subscription-payments.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Param,
  ParseIntPipe,
  BadRequestException,
  Patch,
  Delete,
  Query,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiServiceUnavailableResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import { OneSubscriptionPaymentResponseDto } from './dto/subscription-payments-response.dto';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { PaginatedSubscriptionPaymentResponseDto } from './dto/paginated-subscription-payment-response.dto';
import { QuerySubscriptionPaymentDto } from './dto/query-subscription-payment.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { SubscriptionPaymentWebhookDto } from './dto/subscription-payment-webhook.dto';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { GENERIC_SIGNATURE_HEADER } from 'src/common/utils/webhook-signature.util';
import { SubscriptionWebhookSignatureGuard } from './guards/subscription-webhook-signature.guard';

@ApiTags('Platform SaaS - Subscriptions - Subscription Payments')
@Controller('subscription-payments')
export class SubscriptionPaymentsController {
  constructor(
    private readonly subscriptionPaymentService: SubscriptionPaymentsService,
  ) {}

  @Post('intent')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Create a payment intent (gateway-agnostic)',
    description:
      'Creates an audit payment record with status PENDING for the authenticated company.',
  })
  async createIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new BadRequestException('User must be associated with a merchant');
    }
    return this.subscriptionPaymentService.createIntent(merchantId, dto);
  }

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(SubscriptionWebhookSignatureGuard)
  @ApiOperation({
    summary: 'Payment webhook (gateway-agnostic, HMAC-signed)',
    description:
      'Processes a payment confirmation event and activates/extends the company subscription when paid. Public endpoint: the only authentication is `x-signature: sha256=<hex HMAC-SHA256 of the raw body>` with SUBSCRIPTION_WEBHOOK_SECRET (generic placeholder format until a real gateway is integrated). Only pending payments are processed; repeated events are acknowledged with 200 and ignored.',
  })
  @ApiHeader({ name: GENERIC_SIGNATURE_HEADER, required: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid signature' })
  @ApiServiceUnavailableResponse({
    description: 'SUBSCRIPTION_WEBHOOK_SECRET is not configured',
  })
  async webhook(@Body() dto: SubscriptionPaymentWebhookDto) {
    return this.subscriptionPaymentService.handleWebhook(dto);
  }

  @Post()
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Create a Subscription Payments',
    description: 'Create a new Subscription Payment.',
  })
  @ApiCreatedResponse({
    description: 'Subscription Payment created successfully',
    type: SubscriptionPayment,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid input data: either companySubscriptionId or merchantSubscriptionId must be provided',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
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
  async create(
    @Body() dto: CreateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    return this.subscriptionPaymentService.create(dto);
  }
  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get all Subscription Payments',
    description: 'Retrieve a list of all Subscription Payments.',
  })
  @ApiOkResponse({
    description: 'Paginated list of subscription payments',
    type: PaginatedSubscriptionPaymentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
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
    @Query() query: QuerySubscriptionPaymentDto,
  ): Promise<PaginatedSubscriptionPaymentResponseDto> {
    return this.subscriptionPaymentService.findAll(query);
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get one Subscription Payment',
    description: 'Retrieve a Subscription Payment by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Payment ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Payment retrieved successfully',
    type: SubscriptionPayment,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID format. ID must be a number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Subscription Payment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Payment not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
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
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    if (id <= 0) {
      throw new BadRequestException(
        'Subscription Payment ID must be a positive integer',
      );
    }
    return this.subscriptionPaymentService.findOne(id);
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
    summary: 'Update a Subscription Payment',
    description: 'Update details of an existing Subscription Payment by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Payment ID',
    example: 1,
  })
  @ApiCreatedResponse({
    description: 'Subscription Payment updated successfully',
    type: SubscriptionPayment,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID or request data',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID format. ID must be a number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Subscription Payment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Payment with ID 5 not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
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
    @Body() dto: UpdateSubscriptionPaymentDto,
  ): Promise<OneSubscriptionPaymentResponseDto> {
    return this.subscriptionPaymentService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete a Subscription Payment' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Payment ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Payment deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Subscription Payment deleted successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID format. ID must be a number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Subscription Payment not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Payment not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
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
  ): Promise<OneSubscriptionPaymentResponseDto> {
    return this.subscriptionPaymentService.remove(id);
  }
}
