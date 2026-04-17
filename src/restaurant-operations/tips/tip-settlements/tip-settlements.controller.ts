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
import { TipSettlementsService } from './tip-settlements.service';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
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
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import {
  OneTipSettlementResponseDto,
  PaginatedTipSettlementResponseDto,
} from './dto/tip-settlement-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { SettlementMethod } from './constants/settlement-method.enum';
import {
  GetTipSettlementQueryDto,
  TipSettlementSortBy,
} from './dto/get-tip-settlement-query.dto';

@ApiTags('Tip Settlements')
@ApiBearerAuth()
@Controller('tip-settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipSettlementsController {
  constructor(private readonly tipSettlementsService: TipSettlementsService) {}

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
    summary: 'Create a new Tip Settlement',
    description:
      "Creates a new tip settlement. Collaborator and shift must belong to the authenticated user's merchant.",
  })
  @ApiCreatedResponse({
    description: 'Tip settlement created successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or amount',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({
    description: 'Forbidden - You must be associated with a merchant',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Collaborator, shift, or user not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateTipSettlementDto,
    description: 'Tip settlement creation data',
    examples: {
      example1: {
        summary: 'Create settlement (cash)',
        value: {
          collaboratorId: 1,
          shiftId: 1,
          totalAmount: 150.75,
          settlementMethod: SettlementMethod.CASH,
          settledBy: 1,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateTipSettlementDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tipSettlementsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Tip Settlements with pagination and filters',
    description:
      "Retrieves a paginated list of tip settlements for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'collaboratorId', required: false, type: Number })
  @ApiQuery({ name: 'shiftId', required: false, type: Number })
  @ApiQuery({
    name: 'settlementMethod',
    required: false,
    enum: SettlementMethod,
  })
  @ApiQuery({
    name: 'settledDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: TipSettlementSortBy,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of tip settlements',
    type: PaginatedTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetTipSettlementQueryDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tipSettlementsService.findAll(
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
    summary: 'Get a Tip Settlement by ID',
    description:
      'Retrieves a specific tip settlement. Users can only access settlements from their merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Tip settlement ID' })
  @ApiOkResponse({
    description: 'Tip settlement found successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tipSettlementsService.findOne(id, authenticatedUserMerchantId);
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
    summary: 'Update a Tip Settlement by ID',
    description: 'Updates an existing tip settlement. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Tip settlement ID to update',
  })
  @ApiOkResponse({
    description: 'Tip settlement updated successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateTipSettlementDto,
    description: 'Tip settlement update data (all fields optional)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipSettlementDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tipSettlementsService.update(
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
    summary: 'Delete a Tip Settlement by ID',
    description: 'Permanently deletes a tip settlement.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Tip settlement ID to delete',
  })
  @ApiOkResponse({
    description: 'Tip settlement deleted successfully',
    type: OneTipSettlementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Tip settlement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.tipSettlementsService.remove(id, authenticatedUserMerchantId);
  }
}
