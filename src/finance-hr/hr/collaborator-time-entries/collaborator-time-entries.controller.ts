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
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { GetTimeEntryQueryDto } from './dto/get-time-entry-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { OneTimeEntryResponseDto } from './dto/time-entry-response.dto';
import { PaginatedTimeEntriesResponseDto } from './dto/paginated-time-entries-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Collaborator time entries')
@ApiBearerAuth()
@Controller('collaborator-time-entries')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.COLLABORATOR_TIME_ENTRIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class CollaboratorTimeEntriesController {
  constructor(
    private readonly collaboratorTimeEntriesService: CollaboratorTimeEntriesService,
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
  @ApiOperation({ summary: 'Create time entry' })
  @ApiCreatedResponse({
    description: 'Time entry created',
    type: OneTimeEntryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({
    description: 'Company, Merchant, Collaborator or Shift not found',
  })
  async create(
    @Body() dto: CreateTimeEntryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorTimeEntriesService.create(dto, merchantId);
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
  @ApiOperation({ summary: 'Get all time entries (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'merchant_id', required: false })
  @ApiQuery({ name: 'collaborator_id', required: false })
  @ApiQuery({ name: 'shift_id', required: false })
  @ApiQuery({ name: 'approved', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiOkResponse({
    description: 'Paginated time entries',
    type: PaginatedTimeEntriesResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetTimeEntryQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedTimeEntriesResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorTimeEntriesService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get time entry by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Time entry found',
    type: OneTimeEntryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorTimeEntriesService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update time entry' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Time entry updated',
    type: OneTimeEntryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTimeEntryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorTimeEntriesService.update(id, dto, merchantId);
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
  @ApiOperation({ summary: 'Delete time entry' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Time entry deleted',
    type: OneTimeEntryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Time entry not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneTimeEntryResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorTimeEntriesService.remove(id, merchantId);
  }
}
