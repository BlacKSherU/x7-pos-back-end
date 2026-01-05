// src/subscriptions/subscription-application/subscription-application.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  BadRequestException,
  ParseIntPipe,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SubscriptionApplication } from './entity/subscription-application.entity';
import { SubscriptionApplicationService } from './subscription-application.service';
import { CreateSubscriptionApplicationDto } from './dto/create-subscription-application.dto';
import { OneSubscriptionApplicationResponseDto } from './dto/subscription-application-response.dto';
import { UpdateSubscriptionApplicationDto } from './dto/update-subscription-application.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { PaginatedSubscriptionApplicationResponseDto } from './dto/paginated-subscription-application-response.dto';
import { QuerySubscriptionApplicationDto } from './dto/query-subscription-application.dto';

@ApiTags('Subscription Applications')
@Controller('subscription-applications')
export class SubscriptionApplicationController {
  constructor(
    private readonly subscriptionApplicationService: SubscriptionApplicationService,
  ) {}
  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Create a Subscription Application',
    description: 'Create a new Subscription Application.',
  })
  @ApiCreatedResponse({
    description: 'Subscription Application created successfully',
    type: SubscriptionApplication,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid input data: merchantSubscriptionId must be a positive integer',
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
    @Body() dto: CreateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    return this.subscriptionApplicationService.create(dto);
  }
  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get all Subscription Applications',
    description:
      'Retrieve a list of all Subscription Applications, including related application and plan data.',
  })
  @ApiOkResponse({
    description: 'Paginated list of merchant subscriptions',
    type: PaginatedSubscriptionApplicationResponseDto,
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
    @Query() query: QuerySubscriptionApplicationDto,
  ): Promise<PaginatedSubscriptionApplicationResponseDto> {
    return this.subscriptionApplicationService.findAll(query);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Get one Subscription Application',
    description: 'Retrieve a Subscription Application by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Application ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Application retrieved successfully',
    type: SubscriptionApplication,
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
    description: 'Not Found: Subscription Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Application not found',
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
  ): Promise<OneSubscriptionApplicationResponseDto> {
    if (id <= 0) {
      throw new BadRequestException(
        'Subscription Application ID must be a positive integer',
      );
    }
    return this.subscriptionApplicationService.findOne(id);
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update a Subscription Application',
    description:
      'Update details of an existing Subscription Application by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Application ID',
    example: 1,
  })
  @ApiCreatedResponse({
    description: 'Subscription Application updated successfully',
    type: SubscriptionApplication,
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
    description: 'Not Found: Subscription Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Application with ID 5 not found',
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
    @Body() dto: UpdateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    return this.subscriptionApplicationService.update(id, dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a Subscription Application' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Subscription Application ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Application deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Subscription Application deleted successfully',
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
    description: 'Not Found: Subscription Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Application with ID 5 not found',
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
  ): Promise<OneSubscriptionApplicationResponseDto> {
    return this.subscriptionApplicationService.remove(id);
  }
}
