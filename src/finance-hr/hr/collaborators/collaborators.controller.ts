import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CollaboratorsService } from './collaborators.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneCollaboratorResponseDto } from './dto/collaborator-response.dto';
import { GetCollaboratorsQueryDto } from './dto/get-collaborators-query.dto';
import { PaginatedCollaboratorsResponseDto } from './dto/paginated-collaborators-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Collaborators')
@ApiBearerAuth()
@Controller('collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Collaborator',
    description:
      "Creates a new collaborator for the authenticated user's merchant. Only portal administrators and merchant administrators can create collaborators. The user must exist and not be already associated with another merchant.",
  })
  @ApiCreatedResponse({
    description: 'Collaborator created successfully',
    type: OneCollaboratorResponseDto,
    schema: {
      example: {
        id: 1,
        user_id: 1,
        merchant_id: 1,
        name: 'Jhon Doe',
        role: 'WAITER',
        status: 'ACTIVE',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        user: {
          id: 1,
          firstname: 'Jhon',
          lastname: 'Doe',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    schema: {
      examples: {
        invalidUserId: {
          summary: 'Invalid user ID',
          value: {
            statusCode: 400,
            message: 'user_id must be a positive number',
            error: 'Bad Request',
          },
        },
        invalidName: {
          summary: 'Invalid name',
          value: {
            statusCode: 400,
            message: 'name must be longer than or equal to 1 characters',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only create collaborators for your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create collaborators for your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'User or Merchant not found',
    schema: {
      examples: {
        userNotFound: {
          summary: 'User not found',
          value: {
            statusCode: 404,
            message: 'User with ID 999 not found',
            error: 'Not Found',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User is already a collaborator of another merchant',
    schema: {
      example: {
        statusCode: 409,
        message: 'User is already a collaborator of another merchant',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: CreateCollaboratorDto,
    description: 'Collaborator creation data',
    examples: {
      example1: {
        summary: 'Create waiter collaborator',
        value: {
          user_id: 1,
          merchant_id: 1,
          name: 'Jhon Doe',
          role: 'WAITER',
          status: 'ACTIVE',
        },
      },
      example2: {
        summary: 'Create cook collaborator',
        value: {
          user_id: 2,
          merchant_id: 1,
          name: 'Jane Doe',
          role: 'COOK',
          status: 'ACTIVE',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateCollaboratorDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    return this.collaboratorsService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all Collaborators with pagination and filters',
    description:
      "Retrieves a paginated list of collaborators for the authenticated user's merchant. Supports filtering by status. The response excludes creation and update dates but includes basic merchant and user information.",
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
    name: 'status',
    required: false,
    type: String,
    description: 'Filter collaborators by status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'VACATION', 'DELETED'],
  })
  @ApiOkResponse({
    description: 'Paginated list of collaborators retrieved successfully',
    type: PaginatedCollaboratorsResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            merchant_id: 1,
            name: 'Jhon Doe',
            role: 'WAITER',
            status: 'ACTIVE',
            merchant: {
              id: 1,
              name: 'Restaurant ABC',
            },
            user: {
              id: 1,
              firstname: 'jhon_user',
              lastname: 'jhon@email.com',
            },
          },
        ],
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view collaborators',
    schema: {
      example: {
        statusCode: 403,
        message:
          'User must be associated with a merchant to view collaborators',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or business rule violation',
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
  async findAll(
    @Query() query: GetCollaboratorsQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedCollaboratorsResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    return this.collaboratorsService.findAll(
      query,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Get a Collaborator by ID',
    description:
      'Retrieves a specific collaborator by its ID. Users can only access collaborators from their own merchant. The response excludes creation and update dates but includes basic merchant and user information.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Collaborator ID' })
  @ApiOkResponse({
    description: 'Collaborator found successfully',
    type: OneCollaboratorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view collaborators from your own merchant',
  })
  @ApiNotFoundResponse({
    description: 'Collaborator, User or Merchant not found',
  })
  @ApiBadRequestResponse({ description: 'Invalid collaborator ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    return this.collaboratorsService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a Collaborator by ID',
    description:
      "Updates an existing collaborator for the authenticated user's merchant. Only portal administrators and merchant administrators can update collaborators. All fields are optional.",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Collaborator ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Collaborator updated successfully',
    type: OneCollaboratorResponseDto,
    schema: {
      example: {
        id: 1,
        user_id: 1,
        merchant_id: 1,
        name: 'Jhon Doe Updated',
        role: 'COOK',
        status: 'ACTIVE',
        merchant: {
          id: 1,
          name: 'Restaurant ABC',
        },
        user: {
          id: 1,
          firstname: 'Jhon',
          lastname: 'Doe',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update collaborators from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update collaborators from your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Collaborator, User or Merchant not found',
    schema: {
      examples: {
        collaboratorNotFound: {
          summary: 'Collaborator not found',
          value: {
            statusCode: 404,
            message: 'Collaborator with ID 999 not found',
            error: 'Not Found',
          },
        },
        userNotFound: {
          summary: 'User not found',
          value: {
            statusCode: 404,
            message: 'User with ID 999 not found',
            error: 'Not Found',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid ID',
          value: {
            statusCode: 400,
            message: 'Invalid collaborator ID',
            error: 'Bad Request',
          },
        },
        invalidData: {
          summary: 'Invalid input data',
          value: {
            statusCode: 400,
            message: 'name must be longer than or equal to 1 characters',
            error: 'Bad Request',
          },
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'User is already a collaborator of another merchant',
    schema: {
      example: {
        statusCode: 409,
        message: 'User is already a collaborator of another merchant',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({
    type: UpdateCollaboratorDto,
    description: 'Collaborator update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name and role',
        value: {
          name: 'Jhon Doe Updated',
          role: 'COOK',
        },
      },
      example2: {
        summary: 'Update status only',
        value: {
          status: 'VACATIONS',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    return this.collaboratorsService.update(
      id,
      dto,
      authenticatedUserMerchantId,
    );
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
  @ApiOperation({
    summary: 'Soft delete a Collaborator by ID',
    description:
      'Performs a soft delete by changing the collaborator status to "deleted". Only merchant administrators can delete collaborators from their own merchant. The collaborator information is returned after deletion (excluding creation and update dates) along with basic merchant and user information.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Collaborator ID to delete',
  })
  @ApiOkResponse({
    description: 'Collaborator soft deleted successfully',
    type: OneCollaboratorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete collaborators from your own merchant',
  })
  @ApiNotFoundResponse({
    description: 'Collaborator, User or Merchant not found',
  })
  @ApiBadRequestResponse({ description: 'Invalid collaborator ID' })
  @ApiConflictResponse({
    description: 'Collaborator is already deleted or has active dependencies',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorResponseDto> {
    // Get the merchant_id of the authenticated user
    const authenticatedUserMerchantId = req.merchant?.id;

    return this.collaboratorsService.remove(id, authenticatedUserMerchantId);
  }
}
