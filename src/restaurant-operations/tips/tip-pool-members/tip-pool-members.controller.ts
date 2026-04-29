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

import { TipPoolMembersService } from './tip-pool-members.service';
import { CreateTipPoolMemberDto } from './dto/create-tip-pool-member.dto';
import { UpdateTipPoolMemberDto } from './dto/update-tip-pool-member.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import {
  OneTipPoolMemberResponseDto,
  PaginatedTipPoolMemberResponseDto,
} from './dto/tip-pool-member-response.dto';
import { GetTipPoolMemberQueryDto } from './dto/get-tip-pool-member-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Tip Pool Members')
@ApiBearerAuth()
@Controller('tip-pool-members')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.TIP_POOL_MEMBERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class TipPoolMembersController {
  constructor(private readonly tipPoolMembersService: TipPoolMembersService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Tip Pool Member' })
  @ApiCreatedResponse({
    description: 'Tip pool member created successfully',
    type: OneTipPoolMemberResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBody({ type: CreateTipPoolMemberDto })
  async create(
    @Body() dto: CreateTipPoolMemberDto,
    @Request() req: AuthenticatedUser,
  ) {
    return this.tipPoolMembersService.create(dto, req.merchant?.id);
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
    summary: 'Get all Tip Pool Members with pagination and filters',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'tipPoolId', required: false })
  @ApiQuery({ name: 'collaboratorId', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ type: PaginatedTipPoolMemberResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async findAll(
    @Query() query: GetTipPoolMemberQueryDto,
    @Request() req: AuthenticatedUser,
  ) {
    return this.tipPoolMembersService.findAll(query, req.merchant?.id);
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
  @ApiOperation({ summary: 'Get a Tip Pool Member by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolMemberResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    return this.tipPoolMembersService.findOne(id, req.merchant?.id);
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
  @ApiOperation({ summary: 'Update a Tip Pool Member by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolMemberResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiBody({ type: UpdateTipPoolMemberDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipPoolMemberDto,
    @Request() req: AuthenticatedUser,
  ) {
    return this.tipPoolMembersService.update(id, dto, req.merchant?.id);
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
  @ApiOperation({ summary: 'Soft delete a Tip Pool Member by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolMemberResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    return this.tipPoolMembersService.remove(id, req.merchant?.id);
  }
}
