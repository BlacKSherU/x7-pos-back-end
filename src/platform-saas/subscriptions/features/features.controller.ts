// src/subscriptions/features/features.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  ParseIntPipe,
  BadRequestException,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateFeatureDto } from './dto/create-feature.dto';
import {
  FeatureResponseDto,
  OneFeatureResponseDto,
} from './dto/feature-response.dto';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { PaginatedFeatureResponseDto } from './dto/paginated-feature-response.dto';
import { QueryFeatureDto } from './dto/query-feature.dto';

@ApiTags('Platform SaaS - Subscriptions - Features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @ApiOperation({
    summary: 'Create a new Feature',
    description:
      'Endpoint to create a new Feature. Requires PORTAL_ADMIN or MERCHANT_ADMIN role with appropriate scopes.',
  })
  @ApiBody({
    type: CreateFeatureDto,
    description: 'Data for a new Feature',
  })
  @ApiCreatedResponse({
    description: 'Feature created succesfully',
    type: FeatureResponseDto,
    schema: {
      example: {
        id: 1,
        name: 'Sample Application',
        description: 'This is a sample Application',
        unit: 'Unit Feature',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'name must be a string',
          'description must be a string',
          'unit must be a string',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Feature with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Feature with this name already exists.',
        error: 'Conflict',
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
    description: 'Unauthorized. Invalid or missing token.',
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
  async create(@Body() dto: CreateFeatureDto): Promise<OneFeatureResponseDto> {
    return this.featuresService.create(dto);
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @ApiOperation({
    summary: 'Get all of the Features',
    description: 'Endpoint to retrieve all Applications.',
  })
  @ApiOkResponse({
    description: 'Applications retrieved successfully',
    type: PaginatedFeatureResponseDto,
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
    description: 'Unauthorized. Invalid or missing token.',
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
  async findAll(
    @Query() query: QueryFeatureDto,
  ): Promise<PaginatedFeatureResponseDto> {
    return this.featuresService.findAll(query);
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a Feature by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Feature',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Features retrieved successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Features retrieved succesfully',
        data: [
          {
            id: 1,
            name: 'Advanced Analytics',
            description: 'Provides advanced data analytics capabilities',
            Unit: 'unit 1',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Feature not found',
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
    description: 'Unauthorized. Invalid or missing token.',
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const feature = await this.featuresService.findOne(id);
    return feature;
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a Feature by ID' })
  @ApiBody({
    description: 'Fields to update in the Feature',
    type: UpdateFeatureDto,
    examples: {
      example1: {
        summary: 'Update only name',
        value: { name: 'Updated Feature Name' },
      },
      example2: {
        summary: 'Update multiple fields',
        value: {
          name: 'Updated Advanced Analytics',
          description: 'Provides advanced data analytics capabilities',
          Unit: 'unit 2',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Feature successfully updated',
    schema: {
      example: {
        message: 'Feature was successfully updated.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'name must be a string',
          'description must be a string',
          'unit must be a string',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
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
    description: 'Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Feature not found',
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
    @Body() dto: UpdateFeatureDto,
  ): Promise<OneFeatureResponseDto> {
    return this.featuresService.update(id, dto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a Feature' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Feature to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Feature deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Feature deleted successfully',
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
  @ApiNotFoundResponse({
    description: 'Feature not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Feature not found',
        error: 'Not Found',
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
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Invalid or missing token.',
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
  ): Promise<OneFeatureResponseDto> {
    return this.featuresService.remove(id);
  }
}
