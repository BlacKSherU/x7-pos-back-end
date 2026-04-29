//src/core/configuration/merchant-payroll-rule/merchant-payroll-rule.controller.ts
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
import { MerchantPayrollRuleService } from './merchant-payroll-rule.service';
import { CreateMerchantPayrollRuleDto } from './dto/create-merchant-payroll-rule.dto';
import {
  MerchantPayrollRuleResponseDto,
  OneMerchantPayrollRuleResponseDto,
} from './dto/merchant-payroll-rule-response.dto';
import { PaginatedMerchantPayrollRuleResponseDto } from './dto/paginated-merchant-payroll-rule-response.dto';
import { QueryMerchantPayrollRuleDto } from './dto/query-merchant-payroll-rule.dto';
import { UpdateMerchantPayrollRuleDto } from './dto/update-merchant-payroll-rule.dto';

@ApiTags('Merchant Payroll Rule')
@Controller('merchant-payroll-rule')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.MERCHANT_PAYROLL_RULES)
export class MerchantPayrollRuleController {
  constructor(
    private readonly merchantPayrollRuleService: MerchantPayrollRuleService,
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
    summary: 'Create a new Merchant Payroll Rule',
    description: 'Endpoint to create a new Merchant Payroll Rule.',
  })
  @ApiBody({
    type: CreateMerchantPayrollRuleDto,
    description: 'The details of the Merchant Payroll Rule to be created.',
  })
  @ApiCreatedResponse({
    type: MerchantPayrollRuleResponseDto,
    schema: {
      example: {
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Merchant payroll rule name',
        frequencyPayroll: 'biweekly',
        payDayOfWeek: 2,
        payDayOfMonth: 23,
        allowNegativePayroll: true,
        roundingPrecision: 2,
        currency: 'CLP',
        autoApprovePayroll: true,
        requiresManagerApproval: true,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Merchant Payroll Rule must be a string',
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
    @Body() dto: CreateMerchantPayrollRuleDto,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    return this.merchantPayrollRuleService.create(dto);
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
    summary: 'Get a list of Merchant Payroll Rules',
    description:
      'Endpoint to retrieve a paginated list of Merchant Payroll Rules.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Payroll Rules retrieved successfully.',
    type: PaginatedMerchantPayrollRuleResponseDto,
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
    @Query() query: QueryMerchantPayrollRuleDto,
  ): Promise<PaginatedMerchantPayrollRuleResponseDto> {
    return this.merchantPayrollRuleService.findAll(query);
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
    summary: 'Get a Merchant Payroll Rule by ID',
    description:
      'Endpoint to retrieve a single Merchant Payroll Rule by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Payroll Rule to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Payroll Rule retrieved successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Payroll Rule',
        frequencyPayroll: 'biweekly',
        payDayOfWeek: 2,
        payDayOfMonth: 23,
        allowNegativePayroll: true,
        roundingPrecision: 2,
        currency: 'CLP',
        autoApprovePayroll: true,
        requiresManagerApproval: true,
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
    description: 'Merchant Payroll Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Payroll Rule with ID 1 not found',
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
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const merchantPayrollRule =
      await this.merchantPayrollRuleService.findOne(id);
    return merchantPayrollRule;
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
    summary: 'Update a Merchant Payroll Rule by ID',
    description: 'Endpoint to update an existing Merchant Payroll Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Payroll Rule to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateMerchantPayrollRuleDto,
    description: 'Data to update the Merchant Payroll Rule',
  })
  @ApiOkResponse({
    description: 'Merchant Payroll Rule updated successfully.',
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
        frequencyPayroll: 'monthly',
        payDayOfWeek: 4,
        payDayOfMonth: 29,
        allowNegativePayroll: false,
        roundingPrecision: 4,
        currency: 'USD',
        autoApprovePayroll: true,
        requiresManagerApproval: true,
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
    description: 'Merchant Payroll Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Payroll Rule with ID 1 not found',
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
    @Body() dto: UpdateMerchantPayrollRuleDto,
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    return this.merchantPayrollRuleService.update(id, dto);
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
    summary: 'Delete a Merchant Payroll Rule by ID',
    description: 'Endpoint to delete an existing Merchant Payroll Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Payroll Rule to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Payroll Rule deleted successfully',
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
        frequencyPayroll: 'monthly',
        payDayOfWeek: 4,
        payDayOfMonth: 29,
        allowNegativePayroll: false,
        roundingPrecision: 4,
        currency: 'USD',
        autoApprovePayroll: true,
        requiresManagerApproval: true,
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
    description: 'Merchant Payroll Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Payroll Rule with ID 1 not found',
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
  ): Promise<OneMerchantPayrollRuleResponseDto> {
    return this.merchantPayrollRuleService.remove(id);
  }
}
