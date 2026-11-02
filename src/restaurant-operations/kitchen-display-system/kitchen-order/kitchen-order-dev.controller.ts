import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { KitchenOrderService } from './kitchen-order.service';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

/**
 * KDS development tools. Registered only outside production (see KitchenOrderModule):
 * resetting runs TRUNCATE on the kitchen tables of every merchant, and in production any
 * merchant user could call it.
 */
@ApiTags(
  'Restaurant operations - Kitchen Display System - Kitchen Orders (development)',
)
@ApiBearerAuth()
@Controller('kitchen-orders')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.KITCHEN_ORDERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class KitchenOrderDevController {
  constructor(private readonly kitchenOrderService: KitchenOrderService) {}

  @Post('reset-test-data')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Reset and re-seed KDS test data (development only)',
    description:
      'Not available in production. Every mode TRUNCATEs kitchen_event_log, kitchen_order_item and kitchen_order for ALL merchants, then (except `clear`) seeds test orders for merchant 2.',
  })
  async resetTestData(
    @Request() req: AuthenticatedRequest,
    @Body()
    body?: {
      mode?: 'seed' | 'clear' | 'simple' | 'multi' | 'multi2' | 'allergy';
    },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to reset kitchen test data',
      );
    }
    return this.kitchenOrderService.resetTestData(
      merchantId,
      body?.mode || 'seed',
    );
  }
}
