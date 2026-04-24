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
import { Request as ExpressRequest } from 'express';
import { OnlineMenuService } from './online-menu.service';
import { CreateOnlineMenuDto } from './dto/create-online-menu.dto';
import { UpdateOnlineMenuDto } from './dto/update-online-menu.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneOnlineMenuResponseDto } from './dto/online-menu-response.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };
import { GetOnlineMenuQueryDto } from './dto/get-online-menu-query.dto';
import { PaginatedOnlineMenuResponseDto } from './dto/paginated-online-menu-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Online Menus')
@ApiBearerAuth()
@Controller('online-menus')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnlineMenuController {
  constructor(private readonly onlineMenuService: OnlineMenuService) {}

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
    summary: 'Create a new Online Menu',
    description:
      "Creates a new online menu for an online store. The online store must belong to the authenticated user's merchant. Only portal administrators and merchant administrators can create online menus.",
  })
  @ApiCreatedResponse({
    description: 'Online menu created successfully',
    type: OneOnlineMenuResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation errors',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You must be associated with a merchant to create online menus',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online store not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineMenuDto,
    description: 'Online menu creation data',
    examples: {
      example1: {
        summary: 'Create online menu',
        value: {
          storeId: 1,
          name: 'Main Menu',
          description: 'This is the main menu for our restaurant',
        },
      },
      example2: {
        summary: 'Create online menu without description',
        value: {
          storeId: 1,
          name: 'Dessert Menu',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateOnlineMenuDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Online Menus with pagination and filters',
    description:
      "Retrieves a paginated list of online menus for online stores belonging to the authenticated user's merchant. Supports filtering by store ID, name, active status, and creation date.",
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
    name: 'storeId',
    required: false,
    type: Number,
    description: 'Filter by store ID',
    example: 1,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name (partial match)',
    example: 'Main Menu',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
    example: '2024-01-15',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'name', 'isActive', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
    example: 'DESC',
  })
  @ApiOkResponse({
    description: 'Paginated list of online menus retrieved successfully',
    type: PaginatedOnlineMenuResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - User must be associated with a merchant to view online menus',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetOnlineMenuQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOnlineMenuResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get an Online Menu by ID',
    description:
      'Retrieves a specific online menu by its ID. Users can only access online menus from online stores belonging to their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Online menu ID' })
  @ApiOkResponse({
    description: 'Online menu found successfully',
    type: OneOnlineMenuResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only view online menus from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu ID',
    type: ErrorResponse,
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Menu by ID',
    description:
      'Updates an existing online menu. Users can only update online menus from online stores belonging to their own merchant. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Online menu updated successfully',
    type: OneOnlineMenuResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only update online menus from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateOnlineMenuDto,
    description: 'Online menu update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update name and description',
        value: {
          name: 'Main Menu Updated',
          description: 'Updated description',
        },
      },
      example2: {
        summary: 'Update active status',
        value: {
          isActive: false,
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOnlineMenuDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Delete an Online Menu by ID',
    description:
      'Permanently deletes an online menu. Users can only delete online menus from online stores belonging to their own merchant.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online menu ID to delete',
  })
  @ApiOkResponse({
    description: 'Online menu deleted successfully',
    type: OneOnlineMenuResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - You can only delete online menus from your own merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online menu not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid online menu ID',
    type: ErrorResponse,
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOnlineMenuResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineMenuService.remove(id, authenticatedUserMerchantId);
  }
}
