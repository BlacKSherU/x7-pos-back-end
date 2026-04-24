//src/restaurant-operations/dining-system/floor-plan/floor-plan.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { FloorPlanService } from './floor-plan.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import {
  FloorPlanResponseDto,
  OneFloorPlanResponseDto,
} from './dto/floor-plan-response.dto';
import { PaginatedFloorPlanResponseDto } from './dto/paginated-floor-plan-response.dto';
import { QueryFloorPlanDto } from './dto/query-floor-plan.dto';
import { UpdateFloorPlanDto } from './dto/update-floor-plan.dto';

@ApiTags('Floor Plan')
@Controller('floor-plan')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.FLOOR_PLANS)
export class FloorPlanController {
  constructor(private readonly floorPlanService: FloorPlanService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new floor plan',
    description: 'Endpoint to create a new floor plan for the dining system',
  })
  @ApiBody({
    type: CreateFloorPlanDto,
    description: 'The details of the floor plan to be created',
  })
  @ApiCreatedResponse({
    type: FloorPlanResponseDto,
    schema: {
      example: {
        merchant: 1,
        name: 'Main Floor Plan',
        width: 500,
        height: 300,
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Floor plan name must be a string',
          'status must be one of the following values: active, inactive',
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
    @Body() dto: CreateFloorPlanDto,
  ): Promise<OneFloorPlanResponseDto> {
    return this.floorPlanService.create(dto);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a list of Floor Plans',
    description: 'Endpoint to retrieve a paginated list of Floor Plans.',
  })
  @ApiOkResponse({
    description: 'List of Floor Plans retrieved successfully.',
    type: PaginatedFloorPlanResponseDto,
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
  async findAll(
    @Query() query: QueryFloorPlanDto,
  ): Promise<PaginatedFloorPlanResponseDto> {
    return this.floorPlanService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a Floor Plan by ID',
    description: 'Endpoint to retrieve a single Floor Plan by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Plan to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Floor Plan retrieved successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Floor Plan',
        width: 500,
        height: 300,
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
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
  @ApiNotFoundResponse({
    description: 'Floor Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Plan with ID 1 not found',
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
  ): Promise<OneFloorPlanResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const floorPlan = await this.floorPlanService.findOne(id);
    return floorPlan;
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Update a Floor Plan by ID',
    description: 'Endpoint to update an existing Floor Plan.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Plan to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateFloorPlanDto,
    description: 'Data to update the Floor Plan',
  })
  @ApiOkResponse({
    description: 'Floor Plan updated successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Floor Plan',
        width: 500,
        height: 300,
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'ID must be a number',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Floor Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Plan with ID 1 not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
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
    @Body() dto: UpdateFloorPlanDto,
  ): Promise<OneFloorPlanResponseDto> {
    return this.floorPlanService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Delete a Floor Plan by ID',
    description: 'Endpoint to delete an existing Floor Plan.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Plan to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Floor Plan deleted successfully',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Floor Plan',
        width: 500,
        height: 300,
        status: 'deleted',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Floor Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Plan with ID 1 not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
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
  ): Promise<OneFloorPlanResponseDto> {
    return this.floorPlanService.remove(id);
  }
}
