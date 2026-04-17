// src/customers/customers.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Customer } from './entities/customer.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Customers')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    type: Customer,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  // 'portal_admin', 'portal_user', 'merchant_admin', 'merchant_user'
  @ApiBody({ type: CreateCustomerDto })
  @Roles('portal_admin', 'merchant_admin', 'customer_admin')
  create(@Body() dto: CreateCustomerDto, @Request() req: AuthenticatedUser) {
    return this.customersService.create(dto, req);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({
    status: 200,
    description: 'List of customers',
    type: [Customer],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  @Roles(
    'portal_admin',
    'merchant_admin',
    'customer_admin',
    'portal_user',
    'merchant_user',
    'customer_user',
  )
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer found', type: Customer })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  @Roles(
    'portal_admin',
    'merchant_admin',
    'customer_admin',
    'portal_user',
    'merchant_user',
    'customer_user',
  )
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    return this.customersService.findOne(id, req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Company updated', type: Customer })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Company not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @Roles('portal_admin', 'merchant_admin', 'customer_admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @Request() req: AuthenticatedUser,
  ) {
    return this.customersService.update(id, dto, req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer deleted' })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Customer not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  @Roles('portal_admin', 'merchant_admin', 'customer_admin')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedUser,
  ) {
    return this.customersService.remove(id, req);
  }
}
