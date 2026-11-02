import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

@ApiTags('Finance & HR')
@ApiBearerAuth()
@Controller('finance-hr')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.COLLABORATORS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class FinanceHrController {}
