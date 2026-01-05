import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { GetPurchaseOrdersQueryDto } from './dto/get-purchase-orders-query.dto';
import { AllPaginatedPurchaseOrders } from './dto/all-paginated-purchase-order.dto';
import { PurchaseOrderStatus } from './constants/purchase-order-status.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('purchase-order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

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
    summary: 'Create a new purchase order',
    description: 'Creates a new purchase order for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order created successfully',
    // type: PurchaseOrderResponseDto, // Asumo que existe un DTO de respuesta para PurchaseOrder
    schema: {
      example: {
        id: 1,
        status: PurchaseOrderStatus.PENDING,
        supplier: {
          id: 1,
          name: 'Supplier ABC',
        },
        merchant: {
          id: 1,
          name: 'Merchant ABC',
        },
        totalAmount: 100.0,
        createdAt: '2023-01-01T10:00:00Z',
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
            message: ['supplierId must be a number string'],
            error: 'Bad Request',
          },
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 400,
            message: 'Merchant with ID 999 not found',
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
    @Body() createPurchaseOrderDto: CreatePurchaseOrderDto,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderService.create(merchantId, createPurchaseOrderDto);
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
    summary: 'Get all purchase orders with pagination and filters',
    description:
      'Retrieves a paginated list of purchase orders with optional filters. Users can only see purchase orders from their own merchant. Supports filtering by status and supplier ID.',
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
    enum: PurchaseOrderStatus,
    description: 'Filter purchase orders by status',
    example: PurchaseOrderStatus.PENDING,
  })
  @ApiOkResponse({
    description: 'Paginated list of purchase orders retrieved successfully',
    type: AllPaginatedPurchaseOrders,
    schema: {
      example: {
        data: [
          {
            id: 1,
            status: PurchaseOrderStatus.PENDING,
            supplier: {
              id: 1,
              name: 'Supplier ABC',
            },
            merchant: {
              id: 1,
              name: 'Merchant ABC',
            },
            totalAmount: 100.0,
            createdAt: '2023-01-01T10:00:00Z',
          },
          {
            id: 2,
            status: PurchaseOrderStatus.COMPLETED,
            supplier: {
              id: 2,
              name: 'Supplier XYZ',
            },
            merchant: {
              id: 1,
              name: 'Merchant ABC',
            },
            totalAmount: 250.0,
            createdAt: '2023-01-02T11:00:00Z',
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
    @Query() query: GetPurchaseOrdersQueryDto,
  ): Promise<AllPaginatedPurchaseOrders> {
    const merchantId = user.merchant.id;
    return this.purchaseOrderService.findAll(query, merchantId);
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
    summary: 'Get a purchase order by ID',
    description:
      'Retrieves a single purchase order by its ID. Users can only see purchase orders from their own merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order retrieved successfully',
    // type: OnePurchaseOrderResponse, // Asumo que existe un DTO de respuesta para OnePurchaseOrderResponse
    schema: {
      example: {
        statusCode: 200,
        message: 'Purchase Order retrieved successfully',
        data: {
          id: 1,
          status: PurchaseOrderStatus.PENDING,
          supplier: {
            id: 1,
            name: 'Supplier ABC',
          },
          merchant: {
            id: 1,
            name: 'Merchant ABC',
          },
          totalAmount: 100.0,
          createdAt: '2023-01-01T10:00:00Z',
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
    description: 'Purchase order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase Order with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'Purchase Order ID incorrect',
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
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderService.findOne(+id, merchantId);
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
    summary: 'Update a purchase order by ID',
    description:
      'Updates an existing purchase order by its ID for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order updated successfully',
    // type: OnePurchaseOrderResponse, // Asumo que existe un DTO de respuesta para OnePurchaseOrderResponse
    schema: {
      example: {
        statusCode: 201,
        message: 'Purchase Order Updated successfully',
        data: {
          id: 1,
          status: PurchaseOrderStatus.PENDING,
          supplier: {
            id: 1,
            name: 'Supplier ABC',
          },
          merchant: {
            id: 1,
            name: 'Merchant ABC',
          },
          totalAmount: 100.0,
          createdAt: '2023-01-01T10:00:00Z',
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
    description: 'Purchase order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase Order with ID 999 not found',
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
            message: ['status must be a valid enum value'],
            error: 'Bad Request',
          },
        },
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Purchase Order ID incorrect',
            error: 'Bad Request',
          },
        },
        differentMerchant: {
          summary: 'Different merchant ID',
          value: {
            statusCode: 400,
            message: 'Cannot update purchase order for a different merchant',
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
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    const merchantId = user.merchant.id;
    return this.purchaseOrderService.update(
      +id,
      merchantId,
      updatePurchaseOrderDto,
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
    summary: 'Delete a purchase order by ID',
    description:
      'Deletes (marks as inactive) an existing purchase order by its ID for the authenticated merchant.',
  })
  @ApiOkResponse({
    description: 'Purchase order deleted successfully',
    // type: OnePurchaseOrderResponse, // Asumo que existe un DTO de respuesta para OnePurchaseOrderResponse
    schema: {
      example: {
        statusCode: 201,
        message: 'Purchase Order Deleted successfully',
        data: {
          id: 1,
          status: PurchaseOrderStatus.PENDING,
          supplier: {
            id: 1,
            name: 'Supplier ABC',
          },
          merchant: {
            id: 1,
            name: 'Merchant ABC',
          },
          totalAmount: 100.0,
          createdAt: '2023-01-01T10:00:00Z',
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
    description: 'Purchase order not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Purchase Order with ID 999 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'Purchase Order ID incorrect',
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
    return this.purchaseOrderService.remove(+id, merchantId);
  }
}
