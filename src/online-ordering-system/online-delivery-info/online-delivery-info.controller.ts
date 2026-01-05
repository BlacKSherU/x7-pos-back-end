import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { OnlineDeliveryInfoService } from './online-delivery-info.service';
import { CreateOnlineDeliveryInfoDto } from './dto/create-online-delivery-info.dto';
import { UpdateOnlineDeliveryInfoDto } from './dto/update-online-delivery-info.dto';
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
  ApiConflictResponse,
} from '@nestjs/swagger';
import { OnlineDeliveryInfoResponseDto, OneOnlineDeliveryInfoResponseDto } from './dto/online-delivery-info-response.dto';
import { GetOnlineDeliveryInfoQueryDto } from './dto/get-online-delivery-info-query.dto';
import { PaginatedOnlineDeliveryInfoResponseDto } from './dto/paginated-online-delivery-info-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Online Delivery Info')
@ApiBearerAuth()
@Controller('online-delivery-info')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OnlineDeliveryInfoController {
  constructor(private readonly onlineDeliveryInfoService: OnlineDeliveryInfoService) {}

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
    summary: 'Create a new Online Delivery Info',
    description: 'Creates a new online delivery info. The online order must belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can create online delivery info.',
  })
  @ApiCreatedResponse({
    description: 'Online delivery info created successfully',
    type: OneOnlineDeliveryInfoResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to create online delivery info',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online order not found or you do not have access to it',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateOnlineDeliveryInfoDto,
    description: 'Online delivery info creation data',
    examples: {
      example1: {
        summary: 'Create online delivery info',
        value: {
          onlineOrderId: 1,
          customerName: 'John Doe',
          address: '123 Main Street, Apt 4B',
          city: 'New York',
          phone: '+1-555-123-4567',
          deliveryInstructions: 'Ring the doorbell twice',
        },
      },
    },
  })
  async create(@Body() createOnlineDeliveryInfoDto: CreateOnlineDeliveryInfoDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineDeliveryInfoService.create(createOnlineDeliveryInfoDto, authenticatedUserMerchantId);
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
    summary: 'Get all Online Delivery Info',
    description: 'Retrieves a paginated list of online delivery info. Only returns info from online orders that belong to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access online delivery info.',
  })
  @ApiOkResponse({
    description: 'Online delivery info retrieved successfully',
    type: PaginatedOnlineDeliveryInfoResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access online delivery info',
    type: ErrorResponse,
  })
  @ApiQuery({
    name: 'onlineOrderId',
    required: false,
    type: Number,
    description: 'Filter by online order ID',
  })
  @ApiQuery({
    name: 'customerName',
    required: false,
    type: String,
    description: 'Filter by customer name (partial match)',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (minimum 1, maximum 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['id', 'onlineOrderId', 'customerName', 'city', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  async findAll(@Query() query: GetOnlineDeliveryInfoQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineDeliveryInfoService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a single Online Delivery Info by ID',
    description: 'Retrieves a single online delivery info by its ID. The info must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can access online delivery info.',
  })
  @ApiOkResponse({
    description: 'Online delivery info retrieved successfully',
    type: OneOnlineDeliveryInfoResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to access online delivery info',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online delivery info not found',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online delivery info ID',
    example: 1,
  })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineDeliveryInfoService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update an Online Delivery Info',
    description: 'Updates an existing online delivery info. The info must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can update online delivery info.',
  })
  @ApiOkResponse({
    description: 'Online delivery info updated successfully',
    type: OneOnlineDeliveryInfoResponseDto,
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
    description: 'Forbidden - You must be associated with a merchant to update online delivery info',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online delivery info or online order not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Cannot update a deleted online delivery info',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online delivery info ID',
    example: 1,
  })
  @ApiBody({
    type: UpdateOnlineDeliveryInfoDto,
    description: 'Online delivery info update data',
    examples: {
      example1: {
        summary: 'Update address and phone',
        value: {
          address: '456 Oak Avenue, Suite 2',
          phone: '+1-555-987-6543',
        },
      },
      example2: {
        summary: 'Update delivery instructions',
        value: {
          deliveryInstructions: 'Leave at the front door',
        },
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOnlineDeliveryInfoDto: UpdateOnlineDeliveryInfoDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineDeliveryInfoService.update(id, updateOnlineDeliveryInfoDto, authenticatedUserMerchantId);
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an Online Delivery Info',
    description: 'Performs a logical deletion of an online delivery info. The info must belong to an online order that belongs to the authenticated user\'s merchant. Only portal administrators and merchant administrators can delete online delivery info.',
  })
  @ApiOkResponse({
    description: 'Online delivery info deleted successfully',
    type: OneOnlineDeliveryInfoResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to delete online delivery info',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Online delivery info not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Conflict - Online delivery info is already deleted',
    type: ErrorResponse,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Online delivery info ID',
    example: 1,
  })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.onlineDeliveryInfoService.remove(id, authenticatedUserMerchantId);
  }
}
