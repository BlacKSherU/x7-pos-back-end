import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { QueryCompanySubscriptionDto } from './dtos/query-company-subscription.dto';
import { UpdateCompanySubscriptionDto } from './dtos/update-company-subscription.dto';
import {
  CompanySubscriptionListResponseDto,
  OneCompanySubscriptionResponseDto,
} from './dtos/company-subscription-response.dto';

@Controller('company-subscriptions')
@ApiTags('Platform SaaS - Company Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanySubscriptionsController {
  constructor(private readonly service: CompanySubscriptionsService) {}

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({
    summary: 'List the plan each company is subscribed to (portal only)',
  })
  @ApiOkResponse({ type: CompanySubscriptionListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(
    @Query() query: QueryCompanySubscriptionDto,
  ): Promise<CompanySubscriptionListResponseDto> {
    return this.service.findAll(query);
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({
    summary: "Change a company's plan, status, dates or payment method",
  })
  @ApiOkResponse({ type: OneCompanySubscriptionResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid data or end date before start date',
  })
  @ApiNotFoundResponse({ description: 'Subscription or plan not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanySubscriptionDto,
  ): Promise<OneCompanySubscriptionResponseDto> {
    return this.service.update(id, dto);
  }
}
