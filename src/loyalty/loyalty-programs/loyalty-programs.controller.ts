import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Patch,
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
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LoyaltyProgramsService } from './loyalty-programs.service';
import { CreateLoyaltyProgramDto } from './dto/create-loyalty-program.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';
import { GetLoyaltyProgramsQueryDto } from './dto/get-loyalty-programs-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { AllPaginatedLoyaltyPrograms } from './dto/all-paginated-loyalty-programs.dto';
import { OneLoyaltyProgramResponse } from './dto/loyalty-program-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Programs')
@Controller('loyalty-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyProgramsController {
  constructor(
    private readonly loyaltyProgramsService: LoyaltyProgramsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Program' })
  @ApiCreatedResponse({
    description: 'Loyalty Program created successfully',
    type: OneLoyaltyProgramResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: [
          'name must be a string',
          'points_per_currency must be a number',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiConflictResponse({ description: 'Loyalty Program already exists' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiBody({ type: CreateLoyaltyProgramDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyProgramDto: CreateLoyaltyProgramDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyProgramsService.create(
      merchantId,
      createLoyaltyProgramDto,
    );
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
    summary: 'Get all loyalty programs with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty programs with optional filters. Users can only see loyalty programs from their own merchant.',
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
    description: 'Filter by loyalty program name',
    example: 'Gold Program',
  })
  @ApiOkResponse({
    description: 'Paginated list of loyalty programs retrieved successfully',
    type: AllPaginatedLoyaltyPrograms,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty programs retrieved successfully',
        data: [
          {
            id: 1,
            name: 'Gold Program',
            description: 'Earn points for every purchase',
            is_active: true,
            points_per_currency: 1,
            min_points_to_redeem: 100,
            created_at: '2025-12-30T17:50:12.000Z',
            updated_at: '2025-12-30T17:50:12.000Z',
            merchant: {
              id: 1,
              name: 'Super Merchant',
            },
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
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or business rule violation',
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
      },
    },
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyProgramsQueryDto,
  ): Promise<AllPaginatedLoyaltyPrograms> {
    const merchantId = user.merchant.id;
    return this.loyaltyProgramsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Program by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Program ID' })
  @ApiOkResponse({
    description: 'Loyalty Program found',
    type: OneLoyaltyProgramResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Program not found',
    type: ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Program not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Program not found',
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
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyProgramsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Program' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Program ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Program not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiBody({ type: UpdateLoyaltyProgramDto })
  @ApiOkResponse({
    description: 'Loyalty Program updated successfully',
    type: OneLoyaltyProgramResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Program not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Program not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
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
    @Body() updateLoyaltyProgramDto: UpdateLoyaltyProgramDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyProgramsService.update(
      id,
      merchantId,
      updateLoyaltyProgramDto,
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
  @ApiOperation({ summary: 'Delete a Loyalty Program' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Program ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Loyalty Program not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiOkResponse({
    description: 'Loyalty Program deleted successfully',
    type: OneLoyaltyProgramResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Program not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty Program not found',
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
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyProgramsService.remove(id, merchantId);
  }
}
