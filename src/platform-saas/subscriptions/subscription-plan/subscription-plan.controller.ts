// src/subscriptions/subscription-plan/subscription-plan.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { OneSubscriptionPlanResponseDto } from './dto/subscription-plan-response.dto';
import { QuerySubscriptionPlanDto } from './dto/query-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { PaginatedSubscriptionPlanResponseDto } from './dto/paginated-subscription-plan-response.dto';

@ApiTags('Platform SaaS - Subscriptions - Subscription Plans')
@Controller('subscription-plan')
export class SubscriptionPlanController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({
    summary: 'Create a new Subscription Plan',
    description: 'Endpoint for creating a new Subscription Plan in the system.',
  })
  @ApiBody({
    type: CreateSubscriptionPlanDto,
    description: 'Require Data for a new Subscription Plan',
  })
  @ApiCreatedResponse({
    description: 'The Subscription Plan has been successfully created',
    type: SubscriptionPlan,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'name must be a string',
          'description must be a string',
          'price must be a number conforming to the specified constraints',
          'billingCycle must be a string',
          'status must be a string',
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
  @ApiConflictResponse({
    description: 'Subscription Plan with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Subscription Plan with this name already exists',
        error: 'Conflict',
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
    @Body() dto: CreateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.create(dto);
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({
    summary: 'Get all Subscription Plans',
    description: 'Endpoint for get ALL of the Subscription Plans.',
  })
  @ApiOkResponse({
    description: 'Paginated list of subscription plans',
    type: PaginatedSubscriptionPlanResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
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
    description: 'Forbidden. Insufficient permissions',
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
    @Query() query: QuerySubscriptionPlanDto,
  ): Promise<PaginatedSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.findAll(query);
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a Subscription Plan by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Subscription Plan',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Plan retrieved successfully',
    schema: {
      example: {
        id: 1,
        name: 'Basic Plan',
        description: 'Acceso limitado',
        price: 9.99,
        billingCycle: 'monthly',
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a positive integer',
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
    description: 'Forbidden. Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Plan not found',
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const plan = await this.subscriptionPlanService.findOne(id);
    return plan;
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a Subscription Plan' })
  @ApiBody({
    description: 'Fields to update in the Subscription Plan',
    type: UpdateSubscriptionPlanDto,
    examples: {
      example1: {
        summary: 'Update only name',
        value: { name: 'Updated Plan Name' },
      },
      example2: {
        summary: 'Update multiple fields',
        value: {
          name: 'Pro Plan',
          description: 'Full access to all features',
          price: 49.99,
          billingCycle: 'monthly',
          status: 'active',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Subscription Plan successfully updated',
    schema: {
      example: {
        message: 'Subscription Plan with ID 5 was successfully updated.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter or invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['id must be a number', 'name must be a string'],
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
    description: 'Forbidden. Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Plan not found',
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a Subscription Plan' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Subscription Plan to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Plan deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Subscription Plan deleted successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a positive integer',
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
    description: 'Forbidden. Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription plan not found',
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
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.remove(id);
  }
}
