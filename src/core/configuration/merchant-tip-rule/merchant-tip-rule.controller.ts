//src/core/configuration/merchant-tip-rule/merchant-tip-rule.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateMerchantTipRuleDto } from './dto/create-merchant-tip-rule.dto';
import {
  MerchantTipRuleResponseDto,
  OneMerchantTipRuleResponseDto,
} from './dto/merchant-tip-rule-response.dto';
import { MerchantTipRuleService } from './merchant-tip-rule.service';
import { PaginatedMerchantTipRuleResponseDto } from './dto/paginated-merchant-tip-rule-response.dto';
import { QueryMerchantTipRuleDto } from './dto/query-merchant-tip-rule.dto';
import { UpdateMerchantTipRuleDto } from './dto/update-merchant-tip-rule.dto';

@ApiTags('Merchant Tip Rule')
@Controller('merchant-tip-rule')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.MERCHANT_TIPS_RULES)
export class MerchantTipRuleController {
  constructor(
    private readonly merchantTipRuleService: MerchantTipRuleService,
  ) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Merchant Tip Rule',
    description: 'Endpoint to create a new Merchant Tip Rule.',
  })
  @ApiBody({
    type: CreateMerchantTipRuleDto,
    description: 'The details of the Merchant Tip Rule to be created.',
  })
  @ApiCreatedResponse({
    type: MerchantTipRuleResponseDto,
    schema: {
      example: {
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Tip Rule',
        tipCalculationMethod: 'percentage',
        tipDistributionMethod: 'pool',
        suggestedPercentages: [15, 18, 20],
        fixedAmountOptions: [5, 10, 15],
        allowCustomTip: true,
        maximumTipPercentage: 100,
        includeKitchenStaff: false,
        includeManagers: false,
        autoDistribute: true,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Merchant Tip Rule must be a string',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async create(
    @Body() dto: CreateMerchantTipRuleDto,
  ): Promise<OneMerchantTipRuleResponseDto> {
    return this.merchantTipRuleService.create(dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a list of Merchant Tip Rules',
    description: 'Endpoint to retrieve a paginated list of Merchant Tip Rules.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Tip Rules retrieved successfully.',
    type: PaginatedMerchantTipRuleResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findAll(
    @Query() query: QueryMerchantTipRuleDto,
  ): Promise<PaginatedMerchantTipRuleResponseDto> {
    return this.merchantTipRuleService.findAll(query);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Get a Merchant Tip Rule by ID',
    description: 'Endpoint to retrieve a single Merchant Tip Rule by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tip Rule to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Tip Rule retrieved successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Tip Rule',
        tipCalculationMethod: 'percentage',
        tipDistributionMethod: 'pool',
        suggestedPercentages: [15, 18, 20],
        fixedAmountOptions: [5, 10, 15],
        allowCustomTip: true,
        maximumTipPercentage: 100,
        includeKitchenStaff: false,
        includeManagers: false,
        autoDistribute: true,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant Tip Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tip Rule with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMerchantTipRuleResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const merchantTipRule = await this.merchantTipRuleService.findOne(id);
    return merchantTipRule;
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Update a Merchant Tip Rule by ID',
    description: 'Endpoint to update an existing Merchant Tip Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tip Rule to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateMerchantTipRuleDto,
    description: 'Data to update the Merchant Tip Rule',
  })
  @ApiOkResponse({
    description: 'Merchant Tip Rule updated successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'inactive',
        name: 'Updated Tip Rule',
        tipCalculationMethod: 'fixed_amount',
        tipDistributionMethod: 'individual',
        suggestedPercentages: [10, 15, 20],
        fixedAmountOptions: [5, 10, 15],
        allowCustomTip: false,
        maximumTipPercentage: 50,
        includeKitchenStaff: true,
        includeManagers: true,
        autoDistribute: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'ID must be a number',
          'status must be one of the following values: active, inactive',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant Tip Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tip Rule with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantTipRuleDto,
  ): Promise<OneMerchantTipRuleResponseDto> {
    return this.merchantTipRuleService.update(id, dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
  @ApiOperation({
    summary: 'Delete a Merchant Tip Rule by ID',
    description: 'Endpoint to delete an existing Merchant Tip Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tip Rule to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Tip Rule deleted successfully',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'deleted',
        name: 'Updated Tip Rule',
        tipCalculationMethod: 'fixed_amount',
        tipDistributionMethod: 'individual',
        suggestedPercentages: [10, 15, 20],
        fixedAmountOptions: [5, 10, 15],
        allowCustomTip: false,
        maximumTipPercentage: 50,
        includeKitchenStaff: true,
        includeManagers: true,
        autoDistribute: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a number',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant Tip Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tip Rule with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Not authorized. Authentication required',
    schema: {
      example: {
        statusCode: 401,
        message: 'Authentication required',
        error: 'Unauthorized',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMerchantTipRuleResponseDto> {
    return this.merchantTipRuleService.remove(id);
  }
}
