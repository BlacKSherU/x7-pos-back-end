//src/commerce/delivery-system/delivery-zone/delivery-zone.controller.ts
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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { DeliveryZoneService } from './delivery-zone.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import {
  DeliveryZoneResponseDto,
  OneDeliveryZoneResponseDto,
} from './dto/delivery-zone-response.dto';
import { PaginatedDeliveryZoneResponseDto } from './dto/paginated-delivery-zone-response.dto';
import { QueryDeliveryZoneDto } from './dto/query-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { LocateDeliveryZoneDto } from './dto/locate-delivery-zone.dto';
import { RadiusPolygonDto } from './dto/radius-polygon.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiTags('Commerce - Delivery System - Delivery Zone')
@ApiBearerAuth()
@Controller('delivery-zone')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.DELIVERY_ZONES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class DeliveryZoneController {
  constructor(private readonly deliveryZoneService: DeliveryZoneService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a delivery zone',
    description: 'Endpoint to create a delivery zone for a delivery system.',
  })
  @ApiBody({
    type: CreateDeliveryZoneDto,
    description: 'Details of the delivery zone to be created.',
  })
  @ApiCreatedResponse({
    type: DeliveryZoneResponseDto,
    schema: {
      example: {
        merchant: 1,
        name: '1459 Biscayne Blvd, Miami',
        description: 'Delivery zone in the Biscayne Boulevard sector, Miami.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
          'Delivery zone name must be a string',
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
    @Body() dto: CreateDeliveryZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.create(dto, user.merchant?.id);
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
    summary: 'Get a list of Delivery Zones',
    description: 'Endpoint to retrieve a paginated list of Delivery Zones.',
  })
  @ApiOkResponse({
    description: 'List of Delivery Zones retrieved successfully.',
    type: PaginatedDeliveryZoneResponseDto,
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
    @Query() query: QueryDeliveryZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedDeliveryZoneResponseDto> {
    return this.deliveryZoneService.findAll(query, user.merchant?.id);
  }

  // Declaradas ANTES de `:id`: al revés, `locate` y `coverage` entran por el comodín del id.
  @Get('locate')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Point-in-polygon lookup',
    description:
      'Returns the zones of the authenticated merchant whose boundary contains (lat, lng). `covered` is true only when an ACTIVE zone contains the point; inactive/maintenance zones are reported in `blocked_zones`.',
  })
  @ApiOkResponse({ description: 'Geofencing result.' })
  @ApiBadRequestResponse({ description: 'lat/lng missing or out of range.' })
  async locate(
    @Query() query: LocateDeliveryZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryZoneService.locate(
      query.lat,
      query.lng,
      user.merchant?.id,
    );
  }

  @Get('radius-polygon')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Radius-to-polygon template',
    description:
      'Builds a closed GeoJSON Polygon approximating a circle of `radius_km` around (lat, lng), ready to send as `geojson` when creating or editing a zone. Nothing is saved.',
  })
  @ApiOkResponse({ description: 'Generated GeoJSON Polygon.' })
  @ApiBadRequestResponse({
    description: 'lat/lng/radius missing or out of range.',
  })
  radiusPolygon(@Query() query: RadiusPolygonDto) {
    return this.deliveryZoneService.radiusPolygon(query);
  }

  @Get('coverage')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Geofenced coverage KPI',
    description:
      'Zone KPI banner: share of the merchant delivery orders linked to a zone that has a GeoJSON boundary, number of active zones, and live zones missing a GeoJSON boundary.',
  })
  @ApiOkResponse({ description: 'Coverage figures.' })
  async coverage(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryZoneService.coverage(user.merchant?.id);
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
    summary: 'Get a Delivery Zone by ID',
    description: 'Endpoint to retrieve a single Delivery Zone by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Zone retrieved successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: '1459 Biscayne Blvd, Miami',
        description: 'Delivery zone in the Biscayne Boulevard sector, Miami.',
        geojson: {
          type: 'Polygon',
          coordinates: [
            [
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
              [-70.6483, -33.4569],
            ],
          ],
        },
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.findOne(id, user.merchant?.id);
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
    summary: 'Update a Delivery Zone by ID',
    description: 'Endpoint to update an existing Delivery Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateDeliveryZoneDto,
    description: 'Data to update the Delivery Zone',
  })
  @ApiOkResponse({
    description: 'Delivery Zone updated successfully.',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: '1459 Biscayne Blvd, Miami',
        description: 'Delivery zone in the Biscayne Boulevard sector, Miami.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
        status: 'inactive',
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
    @Body() dto: UpdateDeliveryZoneDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.update(id, dto, user.merchant?.id);
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
    summary: 'Delete a Delivery Zone by ID',
    description: 'Endpoint to delete an existing Delivery Zone.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Delivery Zone to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Delivery Zone deleted successfully',
    schema: {
      example: {
        id: 1,
        merchant: 1,
        name: '1459 Biscayne Blvd, Miami',
        description: 'Delivery zone in the Biscayne Boulevard sector, Miami.',
        geojson:
          '{"type":"Polygon","coordinates":[[[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662],[-69.9384,18.4662]]]}',
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
    description: 'Delivery Zone not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Delivery Zone with ID 1 not found',
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
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneDeliveryZoneResponseDto> {
    return this.deliveryZoneService.remove(id, user.merchant?.id);
  }
}
