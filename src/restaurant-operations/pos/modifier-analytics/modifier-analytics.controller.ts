import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';

import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';

import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { ModifierAnalyticsService } from './modifier-analytics.service';

import { GetModifierAnalyticsQueryDto } from './dto/get-modifier-analytics-query.dto';
import { PaginatedModifierAnalyticsResponseDto } from './dto/paginated-modifier-analytics-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@ApiTags('Restaurant operations - POS - Modifier Analytics')
@ApiBearerAuth()
@Controller('modifier-analytics')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ORDER_ITEM_MODIFIERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ModifierAnalyticsController {
  constructor(
    private readonly modifierAnalyticsService: ModifierAnalyticsService,
  ) {}

  @Get('top-modifiers')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
  @ApiOperation({
    summary: 'Get most requested modifiers analytics',
  })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOkResponse({
    type: PaginatedModifierAnalyticsResponseDto,
  })
  async getTopModifiers(
    @Query() query: GetModifierAnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedModifierAnalyticsResponseDto> {
    return this.modifierAnalyticsService.getTopModifiers(
      user.merchant.id,
      query,
    );
  }
}
