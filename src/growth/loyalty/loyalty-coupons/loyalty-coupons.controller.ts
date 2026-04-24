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
  ParseIntPipe,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { LoyaltyCouponsService } from './loyalty-coupons.service';
import { CreateLoyaltyCouponDto } from './dto/create-loyalty-coupon.dto';
import { UpdateLoyaltyCouponDto } from './dto/update-loyalty-coupon.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { GetLoyaltyCouponsQueryDto } from './dto/get-loyalty-coupons-query.dto';
import { LoyaltyCouponResponseDto } from './dto/loyalty-coupon-response.dto';
import { AllPaginatedLoyaltyCouponsDto } from './dto/all-paginated-loyalty-coupons.dto';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';

@ApiTags('Loyalty Coupons')
@ApiBearerAuth()
@Controller('loyalty-coupons')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LOYALTY_COUPONS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LoyaltyCouponsController {
  constructor(private readonly loyaltyCouponsService: LoyaltyCouponsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Loyalty Coupon' })
  @ApiCreatedResponse({
    description: 'Loyalty Coupon created successfully',
    type: LoyaltyCouponResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Loyalty Coupon already exists' })
  @ApiBody({ type: CreateLoyaltyCouponDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyCouponDto: CreateLoyaltyCouponDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyCouponsService.create(
      merchantId,
      createLoyaltyCouponDto,
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
    summary: 'Get all loyalty coupons with pagination and filters',
  })
  @ApiOkResponse({
    description: 'Paginated list of loyalty coupons retrieved successfully',
    type: AllPaginatedLoyaltyCouponsDto,
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyCouponsQueryDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyCouponsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get a Loyalty Coupon by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Coupon ID' })
  @ApiOkResponse({
    description: 'Loyalty Coupon found',
    type: LoyaltyCouponResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Loyalty Coupon not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyCouponsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Loyalty Coupon' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Coupon ID' })
  @ApiBody({ type: UpdateLoyaltyCouponDto })
  @ApiOkResponse({
    description: 'Loyalty Coupon updated successfully',
    type: LoyaltyCouponResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Coupon not found',
    type: ErrorResponse,
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLoyaltyCouponDto: UpdateLoyaltyCouponDto,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyCouponsService.update(
      id,
      merchantId,
      updateLoyaltyCouponDto,
    );
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
  @ApiOperation({ summary: 'Delete a Loyalty Coupon' })
  @ApiParam({ name: 'id', type: Number, description: 'Loyalty Coupon ID' })
  @ApiOkResponse({ description: 'Loyalty Coupon deleted' })
  @ApiResponse({
    status: 404,
    description: 'Loyalty Coupon not found',
    type: ErrorResponse,
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.loyaltyCouponsService.remove(id, merchantId);
  }
}
