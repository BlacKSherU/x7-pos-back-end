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
import { TipsService } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
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
import { OneTipResponseDto, PaginatedTipResponseDto } from './dto/tip-response.dto';
import { GetTipQueryDto } from './dto/get-tip-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { TipMethod } from './constants/tip-method.enum';
import { TipStatus } from './constants/tip-status.enum';

@ApiTags('Tips')
@ApiBearerAuth()
@Controller('tips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

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
    summary: 'Create a new Tip',
    description: "Creates a new tip for the authenticated user's merchant. Order must belong to the merchant.",
  })
  @ApiCreatedResponse({
    description: 'Tip created successfully',
    type: OneTipResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data or validation errors', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing authentication token', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant to create tips',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ description: 'Company, merchant, or order not found', type: ErrorResponse })
  @ApiBody({
    type: CreateTipDto,
    description: 'Tip creation data',
    examples: {
      example1: {
        summary: 'Create tip (card)',
        value: {
          companyId: 1,
          merchantId: 1,
          orderId: 1,
          amount: 5.50,
          method: TipMethod.CARD,
          status: TipStatus.PENDING,
        },
      },
      example2: {
        summary: 'Create tip with payment ID',
        value: {
          companyId: 1,
          merchantId: 1,
          orderId: 1,
          paymentId: 1,
          amount: 10.00,
          method: TipMethod.ONLINE,
          status: TipStatus.SETTLED,
        },
      },
    },
  })
  async create(@Body() dto: CreateTipDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Tips with pagination and filters',
    description: "Retrieves a paginated list of tips for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (minimum 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 10 })
  @ApiQuery({ name: 'companyId', required: false, type: Number, description: 'Filter by company ID' })
  @ApiQuery({ name: 'merchantId', required: false, type: Number, description: 'Filter by merchant ID' })
  @ApiQuery({ name: 'orderId', required: false, type: Number, description: 'Filter by order ID' })
  @ApiQuery({ name: 'paymentId', required: false, type: Number, description: 'Filter by payment ID' })
  @ApiQuery({ name: 'method', required: false, enum: TipMethod, description: 'Filter by method' })
  @ApiQuery({ name: 'status', required: false, enum: TipStatus, description: 'Filter by status' })
  @ApiQuery({ name: 'createdDate', required: false, type: String, description: 'Filter by creation date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['amount', 'status', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of tips retrieved successfully',
    type: PaginatedTipResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden - User must be associated with a merchant', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid query parameters', type: ErrorResponse })
  async findAll(@Query() query: GetTipQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Tip by ID',
    description: 'Retrieves a specific tip by its ID. Users can only access tips from their own merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip ID' })
  @ApiOkResponse({
    description: 'Tip found successfully',
    type: OneTipResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid tip ID', type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Tip by ID',
    description: 'Updates an existing tip. Users can only update tips from their own merchant. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip ID to update' })
  @ApiOkResponse({
    description: 'Tip updated successfully',
    type: OneTipResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid input or ID', type: ErrorResponse })
  @ApiBody({
    type: UpdateTipDto,
    description: 'Tip update data (all fields optional)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Tip by ID',
    description: 'Performs a soft delete by setting the record status to deleted.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip ID to delete' })
  @ApiOkResponse({
    description: 'Tip soft deleted successfully',
    type: OneTipResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Tip is already deleted', type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipsService.remove(id, authenticatedUserMerchantId);
  }
}
