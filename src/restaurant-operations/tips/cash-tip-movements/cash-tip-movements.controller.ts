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
import { CashTipMovementsService } from './cash-tip-movements.service';
import { CreateCashTipMovementDto } from './dto/create-cash-tip-movement.dto';
import { UpdateCashTipMovementDto } from './dto/update-cash-tip-movement.dto';
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
  OneCashTipMovementResponseDto,
  PaginatedCashTipMovementResponseDto,
} from './dto/cash-tip-movement-response.dto';
import {
  GetCashTipMovementQueryDto,
  CashTipMovementSortBy,
} from './dto/get-cash-tip-movement-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { CashTipMovementType } from './constants/cash-tip-movement-type.enum';

@ApiTags('Cash Tip Movements')
@ApiBearerAuth()
@Controller('cash-tip-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashTipMovementsController {
  constructor(
    private readonly cashTipMovementsService: CashTipMovementsService,
  ) {}

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
    summary: 'Create a new Cash Tip Movement',
    description:
      "Creates a new cash tip movement. Cash drawer and tip must belong to the authenticated user's merchant.",
  })
  @ApiCreatedResponse({
    description: 'Cash tip movement created successfully',
    type: OneCashTipMovementResponseDto,
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
    description: 'Cash drawer or tip not found',
    type: ErrorResponse,
  })
  @ApiBody({
    type: CreateCashTipMovementDto,
    description: 'Cash tip movement creation data',
    examples: {
      example1: {
        summary: 'Create movement (in)',
        value: {
          cashDrawerId: 1,
          tipId: 1,
          movementType: CashTipMovementType.IN,
          amount: 25.5,
        },
      },
    },
  })
  async create(
    @Body() dto: CreateCashTipMovementDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTipMovementsService.create(
      dto,
      authenticatedUserMerchantId,
    );
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
    summary: 'Get all Cash Tip Movements with pagination and filters',
    description:
      "Retrieves a paginated list of cash tip movements for the authenticated user's merchant.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'cashDrawerId', required: false, type: Number })
  @ApiQuery({ name: 'tipId', required: false, type: Number })
  @ApiQuery({
    name: 'movementType',
    required: false,
    enum: CashTipMovementType,
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: CashTipMovementSortBy,
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({
    description: 'Paginated list of cash tip movements',
    type: PaginatedCashTipMovementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponse,
  })
  async findAll(
    @Query() query: GetCashTipMovementQueryDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTipMovementsService.findAll(
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
    summary: 'Get a Cash Tip Movement by ID',
    description:
      'Retrieves a specific cash tip movement. Users can only access movements from their merchant cash drawers.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Cash tip movement ID' })
  @ApiOkResponse({
    description: 'Cash tip movement found successfully',
    type: OneCashTipMovementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Cash tip movement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTipMovementsService.findOne(
      id,
      authenticatedUserMerchantId,
    );
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
    summary: 'Update a Cash Tip Movement by ID',
    description:
      'Updates an existing cash tip movement. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Cash tip movement ID to update',
  })
  @ApiOkResponse({
    description: 'Cash tip movement updated successfully',
    type: OneCashTipMovementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Cash tip movement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or ID',
    type: ErrorResponse,
  })
  @ApiBody({
    type: UpdateCashTipMovementDto,
    description: 'Cash tip movement update data (all fields optional)',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCashTipMovementDto,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTipMovementsService.update(
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
    summary: 'Delete a Cash Tip Movement by ID',
    description: 'Permanently deletes a cash tip movement.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Cash tip movement ID to delete',
  })
  @ApiOkResponse({
    description: 'Cash tip movement deleted successfully',
    type: OneCashTipMovementResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Cash tip movement not found',
    type: ErrorResponse,
  })
  @ApiBadRequestResponse({ description: 'Invalid ID', type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    const authenticatedUserMerchantId = req.merchant?.id;
    return this.cashTipMovementsService.remove(id, authenticatedUserMerchantId);
  }
}
