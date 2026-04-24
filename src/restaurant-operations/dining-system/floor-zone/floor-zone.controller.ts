//src/restaurant-operations/dining-system/floor-zone/floor-zone.controller.ts
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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { FloorZoneService } from './floor-zone.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateFloorZoneDto } from './dto/create-floor-zone.dto';
import {
  FloorZoneResponseDto,
  OneFloorZoneResponseDto,
} from './dto/floor-zone-response.dto';
import { QueryFloorZoneDto } from './dto/query-floor-zone.dto';
import { PaginatedFloorZoneResponseDto } from './dto/paginated-floor-zone-response.dto';
import { UpdateFloorZoneDto } from './dto/update-floor-zone.dto';

@ApiTags('Floor Zone')
@Controller('floor-zone')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.TABLE_ZONES)
export class FloorZoneController {
  constructor(private readonly floorZoneService: FloorZoneService) {}
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
    summary: 'Create a new floor zone',
    description: 'Endpoint to create a new floor zone for the dining system',
  })
  @ApiBody({
    type: CreateFloorZoneDto,
    description: 'The details of the floor zone to be created',
  })
  @ApiCreatedResponse({
    type: FloorZoneResponseDto,
    schema: {
      example: {
        merchant: 1,
        name: 'Main Dining Area',
        color: 'Blue',
        floorPlan: 1,
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
          'Floor zone name must be a string',
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
    @Body() dto: CreateFloorZoneDto,
  ): Promise<OneFloorZoneResponseDto> {
    return this.floorZoneService.create(dto);
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
    summary: 'Get a list of Merchant Tax Rules',
    description: 'Endpoint to retrieve a paginated list of Merchant Tax Rules.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Tax Rules retrieved successfully.',
    type: PaginatedFloorZoneResponseDto,
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
    @Query() query: QueryFloorZoneDto,
  ): Promise<PaginatedFloorZoneResponseDto> {
    return this.floorZoneService.findAll(query);
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
    summary: 'Get a Floor Zone by ID',
    description: 'Endpoint to retrieve a single Floor Zone by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Zone to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Floor Zone retrieved successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Dining Area',
        color: 'Blue',
        floorPlan: 1,
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
    description: 'Floor Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Zone with ID 1 not found',
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
  ): Promise<OneFloorZoneResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const floorZone = await this.floorZoneService.findOne(id);
    return floorZone;
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
    summary: 'Update a Floor Zone by ID',
    description: 'Endpoint to update an existing Floor Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Zone to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateFloorZoneDto,
    description: 'Data to update the Floor Zone',
  })
  @ApiOkResponse({
    description: 'Floor Zone updated successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Dining Area',
        color: 'Blue',
        floorPlan: 1,
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
    description: 'Floor Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Zone with ID 1 not found',
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
    @Body() dto: UpdateFloorZoneDto,
  ): Promise<OneFloorZoneResponseDto> {
    return this.floorZoneService.update(id, dto);
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
    summary: 'Delete a Floor Zone by ID',
    description: 'Endpoint to delete an existing Floor Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Floor Zone to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Floor Zone deleted successfully',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: 'Main Dining Area',
        color: 'Blue',
        floorPlan: 1,
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
    description: 'Floor Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Floor Zone with ID 1 not found',
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
  ): Promise<OneFloorZoneResponseDto> {
    return this.floorZoneService.remove(id);
  }
}
