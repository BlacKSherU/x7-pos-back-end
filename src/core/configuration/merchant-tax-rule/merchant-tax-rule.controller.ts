//src/core/configuration/merchant-tax-rule/merchant-tax-rule.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Query,
  ParseIntPipe,
  Param,
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
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { MerchantTaxRuleService } from './merchant-tax-rule.service';
import { CreateMerchantTaxRuleDto } from './dto/create-merchant-tax-rule.dto';
import {
  MerchantTaxRuleResponseDto,
  OneMerchantTaxRuleResponseDto,
} from './dto/merchant-tax-rule-response.dto';
import { PaginatedMerchantTaxRuleResponseDto } from './dto/paginated-merchant-tax-rule-response.dto';
import { QueryMerchantTaxRuleDto } from './dto/query-merchant-tax-rule.dto';
import { UpdateMerchantTaxRuleDto } from './dto/update-merchant-tax-rule.dto';

@ApiTags('Merchant Tax Rule')
@Controller('merchant-tax-rule')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.MERCHANT_TAX_RULES)
export class MerchantTaxRuleController {
  constructor(
    private readonly merchantTaxRuleService: MerchantTaxRuleService,
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
    summary: 'Create a new Merchant Tax Rule',
    description: 'Endpoint to create a new Merchant Tax Rule.',
  })
  @ApiBody({
    type: CreateMerchantTaxRuleDto,
    description: 'The details of the Merchant Tax Rule to be created.',
  })
  @ApiCreatedResponse({
    type: MerchantTaxRuleResponseDto,
    schema: {
      example: {
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Merchant tax rule name',
        description: 'Description of the merchant tax rule',
        taxType: 'percentage',
        rate: 19,
        appliesToTips: true,
        appliesToOvertime: true,
        isCompound: true,
        externalTaxCode: 'lfgtr-hhse',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Merchant Tax Rule must be a string',
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
    @Body() dto: CreateMerchantTaxRuleDto,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    return this.merchantTaxRuleService.create(dto);
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
    summary: 'Get a list of Merchant Tax Rules',
    description: 'Endpoint to retrieve a paginated list of Merchant Tax Rules.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Tax Rules retrieved successfully.',
    type: PaginatedMerchantTaxRuleResponseDto,
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
    @Query() query: QueryMerchantTaxRuleDto,
  ): Promise<PaginatedMerchantTaxRuleResponseDto> {
    return this.merchantTaxRuleService.findAll(query);
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
    summary: 'Get a Merchant Tax Rule by ID',
    description: 'Endpoint to retrieve a single Merchant Tax Rule by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tax Rule to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Tax Rule retrieved successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Tax Rule',
        description: 'Description of the merchant tax rule',
        taxType: 'percentage',
        rate: 19,
        appliesToTips: true,
        appliesToOvertime: true,
        isCompound: true,
        externalTaxCode: 'lfgtr-hhse',
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
    description: 'Merchant Tax Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tax Rule with ID 1 not found',
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
  ): Promise<OneMerchantTaxRuleResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const merchantTaxRule = await this.merchantTaxRuleService.findOne(id);
    return merchantTaxRule;
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
    summary: 'Update a Merchant Tax Rule by ID',
    description: 'Endpoint to update an existing Merchant Tax Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tax Rule to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateMerchantTaxRuleDto,
    description: 'Data to update the Merchant Tax Rule',
  })
  @ApiOkResponse({
    description: 'Merchant Tax Rule updated successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-10-26T12:34:56Z',
        updatedAt: '2023-10-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'inactive',
        name: 'Updated Payroll Rule',
        description: 'Description of the merchant tax rule',
        taxType: 'fixed',
        rate: 15,
        appliesToTips: true,
        appliesToOvertime: false,
        isCompound: false,
        externalTaxCode: 'lfgtr-hhse',
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
    description: 'Merchant Tax Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tax Rule with ID 1 not found',
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
    @Body() dto: UpdateMerchantTaxRuleDto,
  ): Promise<OneMerchantTaxRuleResponseDto> {
    return this.merchantTaxRuleService.update(id, dto);
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
    summary: 'Delete a Merchant Tax Rule by ID',
    description: 'Endpoint to delete an existing Merchant Tax Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Tax Rule to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Tax Rule deleted successfully',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-10-26T12:34:56Z',
        updatedAt: '2023-10-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'deleted',
        name: 'Updated Payroll Rule',
        description: 'Description of the merchant tax rule',
        taxType: 'fixed',
        rate: 15,
        appliesToTips: true,
        appliesToOvertime: false,
        isCompound: false,
        externalTaxCode: 'lfgtr-hhse',
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
    description: 'Merchant Tax Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Tax Rule with ID 1 not found',
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
  ): Promise<OneMerchantTaxRuleResponseDto> {
    return this.merchantTaxRuleService.remove(id);
  }
}
