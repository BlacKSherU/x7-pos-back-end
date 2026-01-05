// src/subscription/plan-features/plan-features.controller.ts
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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { PlanFeaturesService } from './plan-features.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { PlanFeature } from './entity/plan-features.entity';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { OnePlanFeatureResponseDto } from './dto/plan-feature-response.dto';
import { UserRole } from 'src/users/constants/role.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Scope } from 'src/users/constants/scope.enum';
import { UpdatePlanFeatureDto } from './dto/update-plan-features.dto';
import { PaginatedFeatureResponseDto } from '../features/dto/paginated-feature-response.dto';
import { QueryPlanFeatureDto } from './dto/query-plan-feature.dto';
import { PaginatedPlanFeatureResponseDto } from './dto/paginated-plan-feature-response.dto';

@ApiTags('Plan Features')
@Controller('plan-features')
export class PlanFeaturesController {
  constructor(private readonly planFeatureService: PlanFeaturesService) {}
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
    summary: 'Create a Plan Feature',
    description: 'Create a new Plan Feature.',
  })
  @ApiCreatedResponse({
    description: 'Plan Feature created successfully',
    type: PlanFeature,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid input data: subscriptionPlanId and featureId must be a positive integer',
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
    @Body() dto: CreatePlanFeatureDto,
  ): Promise<OnePlanFeatureResponseDto> {
    return this.planFeatureService.create(dto);
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
    summary: 'Get all Plan Features',
    description: 'Retrieve a list of all Plan Features',
  })
  @ApiOkResponse({
    description: 'List of Plan Features retrieved successfully',
    type: PaginatedFeatureResponseDto,
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
    @Query() query: QueryPlanFeatureDto,
  ): Promise<PaginatedPlanFeatureResponseDto> {
    return this.planFeatureService.findAll(query);
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
    summary: 'Get one Plan Feature By Id',
    description: 'Retrieve a Plan Feature by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Plan Feature ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Plan Feature retrieved successfully',
    type: PlanFeature,
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
    description: 'Not Found: Plan Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Plan Feature not found',
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
  ): Promise<OnePlanFeatureResponseDto> {
    if (id <= 0) {
      throw new BadRequestException(
        'Plan Feature ID must be a positive integer',
      );
    }
    return this.planFeatureService.findOne(id);
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
    summary: 'Update a Plan Feature By Id',
    description: 'Update details of an existing Plan Feature by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Plan Feature ID',
    example: 1,
  })
  @ApiCreatedResponse({
    description: 'Plan Feature updated successfully',
    type: PlanFeature,
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
    description: 'Not Found: Plan Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Plan Feature not found',
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
    @Body() dto: UpdatePlanFeatureDto,
  ): Promise<OnePlanFeatureResponseDto> {
    return this.planFeatureService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete a Plan Feature' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Plan Feature ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Plan Feature deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Plan Feature deleted successfully',
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
    description: 'Not Found: Plan Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Plan Feature not found',
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
  ): Promise<OnePlanFeatureResponseDto> {
    return this.planFeatureService.remove(id);
  }
}
