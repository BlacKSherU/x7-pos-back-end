//src/core/configuration/merchant-overtime-rule/merchant-overtime-rule.controller.ts
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
import { MerchantOvertimeRuleService } from './merchant-overtime-rule.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CreateMerchantOvertimeRuleDto } from './dto/create-merchant-overtime-rule.dto';
import {
  MerchantOvertimeRuleResponseDto,
  OneMerchantOvertimeRuleResponseDto,
} from './dto/merchant-overtime-rule-response.dto';
import { PaginatedMerchantOvertimeRuleResponseDto } from './dto/paginated-merchant-overtime-rule-response.dto';
import { QueryMerchantOvertimeRuleDto } from './dto/query-merchant-overtime-rule.dto';
import { UpdateMerchantOvertimeRuleDto } from './dto/update-merchant-overtime-rule.dto';

@ApiTags('Merchant Overtime Rule')
@Controller('merchant-overtime-rule')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.MERCHANT_OVERTIME_RULES)
export class MerchantOvertimeRuleController {
  constructor(
    private readonly merchantOvertimeRuleService: MerchantOvertimeRuleService,
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
    summary: 'Create a new Merchant Overtime Rule',
    description: 'Endpoint to create a new Merchant Overtime Rule.',
  })
  @ApiBody({
    type: CreateMerchantOvertimeRuleDto,
    description: 'The details of the Merchant Overtime Rule to be created.',
  })
  @ApiCreatedResponse({
    type: MerchantOvertimeRuleResponseDto,
    schema: {
      example: {
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Overtime Rule',
        description: 'Description of the Overtime Rule',
        calculationMethod: 'Daily',
        thresholdHours: 8,
        maxHours: 10,
        rateMethod: 'Percentage',
        rateValue: 200,
        appliesOnHolidays: true,
        appliesOnWeekends: true,
        priority: 10,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Merchant Overtime Rule must be a string',
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
    @Body() dto: CreateMerchantOvertimeRuleDto,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    return this.merchantOvertimeRuleService.create(dto);
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
    summary: 'Get a list of Merchant Overtime Rules',
    description:
      'Endpoint to retrieve a paginated list of Merchant Overtime Rules.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Overtime Rules retrieved successfully.',
    type: PaginatedMerchantOvertimeRuleResponseDto,
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
    @Query() query: QueryMerchantOvertimeRuleDto,
  ): Promise<PaginatedMerchantOvertimeRuleResponseDto> {
    return this.merchantOvertimeRuleService.findAll(query);
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
    summary: 'Get a Merchant Overtime Rule by ID',
    description:
      'Endpoint to retrieve a single Merchant Overtime Rule by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Overtime Rule to retrieve',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Overtime Rule retrieved successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-09-26T12:34:56Z',
        updatedAt: '2023-09-26T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'active',
        name: 'Default Overtime Rule',
        description: 'Description of the Overtime Rule',
        calculationMethod: 'Daily',
        thresholdHours: 8,
        maxHours: 10,
        rateMethod: 'Percentage',
        rateValue: 200,
        appliesOnHolidays: true,
        appliesOnWeekends: true,
        priority: 10,
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
    description: 'Merchant Overtime Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Overtime Rule with ID 1 not found',
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
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    if (id <= 0) {
      throw new Error('ID must be a positive integer');
    }
    const merchantOvertimeRule =
      await this.merchantOvertimeRuleService.findOne(id);
    return merchantOvertimeRule;
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
    summary: 'Update a Merchant Overtime Rule by ID',
    description: 'Endpoint to update an existing Merchant Overtime Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Overtime Rule to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateMerchantOvertimeRuleDto,
    description: 'Data to update the Merchant Overtime Rule',
  })
  @ApiOkResponse({
    description: 'Merchant Overtime Rule updated successfully.',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-10-26T12:34:56Z',
        updatedAt: '2023-10-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'inactive',
        name: 'Updated Overtime Rule',
        description: 'Description of the Overtime Rule',
        calculationMethod: 'Weekly',
        thresholdHours: 8,
        maxHours: 20,
        rateMethod: 'percentage',
        rateValue: 200,
        appliesOnHolidays: true,
        appliesOnWeekends: true,
        priority: 1,
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
    description: 'Merchant Overtime Rule not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Overtime Rule with ID 1 not found',
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
    @Body() dto: UpdateMerchantOvertimeRuleDto,
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    return this.merchantOvertimeRuleService.update(id, dto);
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
    summary: 'Delete a Merchant Overtime Rule by ID',
    description: 'Endpoint to delete an existing Merchant Overtime Rule.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Merchant Overtime Rule to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Overtime Rule deleted successfully',
    schema: {
      example: {
        id: 1,
        company: 1,
        createdAt: '2023-10-26T12:34:56Z',
        updatedAt: '2023-10-27T12:34:56Z',
        createdBy: 1,
        updatedBy: 1,
        status: 'deleted',
        name: 'Updated Overtime Rule',
        description: 'Description of the Overtime Rule',
        calculationMethod: 'Weekly',
        thresholdHours: 8,
        maxHours: 20,
        rateMethod: 'percentage',
        rateValue: 200,
        appliesOnHolidays: true,
        appliesOnWeekends: true,
        priority: 1,
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
  ): Promise<OneMerchantOvertimeRuleResponseDto> {
    return this.merchantOvertimeRuleService.remove(id);
  }
}
