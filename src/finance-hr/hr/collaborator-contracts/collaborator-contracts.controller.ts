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

import { CollaboratorContractsService } from './collaborator-contracts.service';
import { CreateCollaboratorContractDto } from './dto/create-collaborator-contract.dto';
import { UpdateCollaboratorContractDto } from './dto/update-collaborator-contract.dto';
import { GetCollaboratorContractQueryDto } from './dto/get-collaborator-contract-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { OneCollaboratorContractResponseDto } from './dto/collaborator-contract-response.dto';
import { PaginatedCollaboratorContractsResponseDto } from './dto/paginated-collaborator-contracts-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Collaborator contracts')
@ApiBearerAuth()
@Controller('collaborator-contracts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.COLLABORATOR_CONTRACTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class CollaboratorContractsController {
  constructor(
    private readonly collaboratorContractsService: CollaboratorContractsService,
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
  @ApiOperation({ summary: 'Create collaborator contract' })
  @ApiBody({
    type: CreateCollaboratorContractDto,
    description: 'Contract data. "active" is optional and defaults to true.',
    examples: {
      minimal: {
        summary: 'Minimal (active defaults to true)',
        value: {
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 1,
          contract_type: 'hourly',
          start_date: '2024-01-01',
        },
      },
      full: {
        summary: 'With all optional fields',
        value: {
          company_id: 1,
          merchant_id: 1,
          collaborator_id: 1,
          contract_type: 'salary',
          base_salary: 500000,
          hourly_rate: 0,
          overtime_multiplier: 1.5,
          double_overtime_multiplier: 2,
          tips_included_in_payroll: false,
          start_date: '2024-01-01',
          end_date: '2025-12-31',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Contract created',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({
    description: 'Company, Merchant or Collaborator not found',
  })
  async create(
    @Body() dto: CreateCollaboratorContractDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorContractsService.create(dto, merchantId);
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
  @ApiOperation({ summary: 'Get all collaborator contracts (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'company_id', required: false })
  @ApiQuery({ name: 'merchant_id', required: false })
  @ApiQuery({ name: 'collaborator_id', required: false })
  @ApiQuery({ name: 'active', required: false })
  @ApiOkResponse({
    description: 'Paginated contracts',
    type: PaginatedCollaboratorContractsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findAll(
    @Query() query: GetCollaboratorContractQueryDto,
    @Request() req: AuthenticatedUser,
  ): Promise<PaginatedCollaboratorContractsResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorContractsService.findAll(query, merchantId);
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
  @ApiOperation({ summary: 'Get collaborator contract by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract found',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorContractsService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update collaborator contract' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract updated',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorContractDto,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorContractsService.update(id, dto, merchantId);
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
  @ApiOperation({ summary: 'Delete collaborator contract' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Contract deleted',
    type: OneCollaboratorContractResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Contract not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ): Promise<OneCollaboratorContractResponseDto> {
    const merchantId = req.merchant?.id;
    return this.collaboratorContractsService.remove(id, merchantId);
  }
}
