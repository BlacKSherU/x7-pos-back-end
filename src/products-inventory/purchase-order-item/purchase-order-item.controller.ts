import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PurchaseOrderItemService } from './purchase-order-item.service';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AllPaginatedPurchaseOrdersItems } from './dto/all-paginated-purchase-order-item.dto';
import { GetPurchaseOrdersItemsQueryDto } from './dto/get-purchase-order-item-query.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('purchase-order-item')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderItemController {
  constructor(
    private readonly purchaseOrderItemService: PurchaseOrderItemService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new purchase order item',
    description:
      'Creates a new purchase order item for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order item created successfully',
    schema: {
      example: {
        id: 1,
        purchaseOrderId: 1,
        productId: 1,
        variantId: null,
        quantity: 5,
        unitPrice: 10.5,
        totalPrice: 52.5,
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
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      examples: {
        invalidData: {
          summary: 'Invalid data provided',
          value: {
            statusCode: 400,
            message: ['productId must be a number string'],
            error: 'Bad Request',
          },
        },
        purchaseOrderNotFound: {
          summary: 'Purchase Order not found',
          value: {
            statusCode: 400,
            message: 'Purchase Order with ID 999 not found',
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
        error: 'Internal Server Error',
      },
    },
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createPurchaseOrderItemDto: CreatePurchaseOrderItemDto,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderItemService.create(
      merchantId,
      createPurchaseOrderItemDto,
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
    summary: 'Get all purchase order items with pagination and filters',
    description:
      'Retrieves a paginated list of purchase order items with optional filters. Users can only see purchase order items from their own merchant. Supports filtering by product.',
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
    name: 'product',
    required: false,
    type: String,
    description: 'Filter purchase order items by product name',
    example: 'Coffee',
  })
  @ApiOkResponse({
    description:
      'Paginated list of purchase order items retrieved successfully',
    type: AllPaginatedPurchaseOrdersItems,
    schema: {
      example: {
        data: [
          {
            id: 1,
            purchaseOrderId: 1,
            productId: 1,
            variantId: null,
            quantity: 5,
            unitPrice: 10.5,
            totalPrice: 52.5,
          },
          {
            id: 2,
            purchaseOrderId: 1,
            productId: 2,
            variantId: 1,
            quantity: 10,
            unitPrice: 20.0,
            totalPrice: 200.0,
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetPurchaseOrdersItemsQueryDto,
  ): Promise<AllPaginatedPurchaseOrdersItems> {
    const merchantId = user.merchant.id;
    return this.purchaseOrderItemService.findAll(query, merchantId);
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
  @ApiOperation({
    summary: 'Get a single purchase order item by ID',
    description:
      'Retrieves a single purchase order item by its ID. Users can only see purchase order items from their own merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order item retrieved successfully',
    schema: {
      example: {
        data: {
          id: 1,
          purchaseOrderId: 1,
          productId: 1,
          variantId: null,
          quantity: 5,
          unitPrice: 10.5,
          totalPrice: 52.5,
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
  @ApiNotFoundResponse({
    description: 'Purchase order item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase order item with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Purchase Order Item ID incorrect',
        error: 'Bad Request',
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
        error: 'Internal Server Error',
      },
    },
  })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderItemService.findOne(+id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a purchase order item by ID',
    description:
      'Updates an existing purchase order item by its ID for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order item updated successfully',
    schema: {
      example: {
        id: 1,
        purchaseOrderId: 1,
        productId: 1,
        variantId: null,
        quantity: 5,
        unitPrice: 10.5,
        totalPrice: 52.5,
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
  @ApiNotFoundResponse({
    description: 'Purchase order item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase Order Item with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data, ID format, or business rule violation',
    schema: {
      examples: {
        invalidData: {
          summary: 'Invalid data provided',
          value: {
            statusCode: 400,
            message: ['quantity must be a number string'],
            error: 'Bad Request',
          },
        },
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Purchase Order Item ID incorrect',
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
        error: 'Internal Server Error',
      },
    },
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderItemService.update(
      +id,
      merchantId,
      updatePurchaseOrderItemDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a purchase order item by ID',
    description:
      'Deletes (marks as inactive) an existing purchase order item by its ID for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order item deleted successfully',
    schema: {
      example: {
        id: 1,
        purchaseOrderId: 1,
        productId: 1,
        variantId: null,
        quantity: 5,
        unitPrice: 10.5,
        totalPrice: 52.5,
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
  @ApiNotFoundResponse({
    description: 'Purchase order item not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase Order Item with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'Purchase Order Item ID incorrect',
        error: 'Bad Request',
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
        error: 'Internal Server Error',
      },
    },
  })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderItemService.remove(+id, merchantId);
  }
}
