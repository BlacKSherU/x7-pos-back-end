import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoyaltyTierService } from './loyalty-tier.service';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { UpdateLoyaltyTierDto } from './dto/update-loyalty-tier.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { GetLoyaltyTiersQueryDto } from './dto/get-loyalty-tiers-query.dto';
import { AllPaginatedLoyaltyTierDto } from './dto/all-paginated-loyalty-tier.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@ApiTags('Loyalty Tiers')
@Controller('loyalty-tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyTierController {
  constructor(private readonly loyaltyTierService: LoyaltyTierService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Tier' })
  @ApiCreatedResponse({
    description: 'Loyalty Tier created successfully',
    type: LoyaltyTier,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Loyalty Tier already exists' })
  @ApiBody({ type: CreateLoyaltyTierDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyTierDto: CreateLoyaltyTierDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyTierService.create(merchantId, createLoyaltyTierDto);
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
    summary: 'Get all loyalty tiers with pagination and filters',
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
  @ApiOkResponse({
    description: 'Paginated list of loyalty tiers retrieved successfully',
    type: AllPaginatedLoyaltyTierDto,
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyTiersQueryDto,
  ): Promise<AllPaginatedLoyaltyTierDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyTierService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Tier by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Tier ID' })
  @ApiOkResponse({ description: 'Loyalty Tier found', type: LoyaltyTier })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Tier not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyTierService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Tier' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Tier ID' })
  @ApiBody({ type: UpdateLoyaltyTierDto })
  @ApiOkResponse({
    description: 'Loyalty Tier updated successfully',
    type: LoyaltyTier,
  })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Tier not found',
    type: ErrorResponse,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLoyaltyTierDto: UpdateLoyaltyTierDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyTierService.update(id, merchantId, updateLoyaltyTierDto);
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
  @ApiOperation({ summary: 'Delete a Loyalty Tier' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Tier ID' })
  @ApiOkResponse({ description: 'Loyalty Tier deleted' })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Tier not found',
    type: ErrorResponse,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyTierService.remove(id, merchantId);
  }
}
