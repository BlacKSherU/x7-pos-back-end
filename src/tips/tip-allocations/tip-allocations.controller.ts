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
import { TipAllocationsService } from './tip-allocations.service';
import { CreateTipAllocationDto } from './dto/create-tip-allocation.dto';
import { UpdateTipAllocationDto } from './dto/update-tip-allocation.dto';
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
import {
  OneTipAllocationResponseDto,
  PaginatedTipAllocationResponseDto,
} from './dto/tip-allocation-response.dto';
import { GetTipAllocationQueryDto } from './dto/get-tip-allocation-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { TipAllocationRole } from './constants/tip-allocation-role.enum';

@ApiTags('Tip Allocations')
@ApiBearerAuth()
@Controller('tip-allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipAllocationsController {
  constructor(private readonly tipAllocationsService: TipAllocationsService) {}

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
    summary: 'Create a new Tip Allocation',
    description:
      "Creates a new tip allocation. Tip, collaborator, and shift must belong to the authenticated user's merchant.",
  })
  @ApiCreatedResponse({
    description: 'Tip allocation created successfully',
    type: OneTipAllocationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input or percentage/amount', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Tip, collaborator, or shift not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateTipAllocationDto,
    description: 'Tip allocation creation data',
    examples: {
      example1: {
        summary: 'Create allocation (waiter 50%)',
        value: {
          tipId: 1,
          collaboratorId: 1,
          shiftId: 1,
          role: TipAllocationRole.WAITER,
          percentage: 50,
          amount: 2.75,
        },
      },
    },
  })
  async create(@Body() dto: CreateTipAllocationDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipAllocationsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Tip Allocations with pagination and filters',
    description: "Retrieves a paginated list of tip allocations for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'tipId', required: false, type: Number })
  @ApiQuery({ name: 'collaboratorId', required: false, type: Number })
  @ApiQuery({ name: 'shiftId', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: TipAllocationRole })
  @ApiQuery({ name: 'createdDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['amount', 'percentage', 'role', 'createdAt', 'updatedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of tip allocations',
    type: PaginatedTipAllocationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid query parameters', type: ErrorResponse })
  async findAll(@Query() query: GetTipAllocationQueryDto, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipAllocationsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Tip Allocation by ID',
    description: 'Retrieves a specific tip allocation. Users can only access allocations for tips from their merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip allocation ID' })
  @ApiOkResponse({
    description: 'Tip allocation found successfully',
    type: OneTipAllocationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip allocation not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipAllocationsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Tip Allocation by ID',
    description: 'Updates an existing tip allocation. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip allocation ID to update' })
  @ApiOkResponse({
    description: 'Tip allocation updated successfully',
    type: OneTipAllocationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip allocation not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid input or ID', type: ErrorResponse })
  @ApiBody({ type: UpdateTipAllocationDto, description: 'Tip allocation update data (all fields optional)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipAllocationDto,
    @Request() req: any,
  ) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipAllocationsService.update(id, dto, authenticatedUserMerchantId);
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
    summary: 'Soft delete a Tip Allocation by ID',
    description: 'Performs a soft delete by setting the record status to deleted.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip allocation ID to delete' })
  @ApiOkResponse({
    description: 'Tip allocation soft deleted successfully',
    type: OneTipAllocationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Tip allocation not found', type: ErrorResponse })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Tip allocation is already deleted', type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.tipAllocationsService.remove(id, authenticatedUserMerchantId);
  }
}
