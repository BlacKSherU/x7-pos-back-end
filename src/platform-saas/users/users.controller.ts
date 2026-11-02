// src/platform-saas/users/users.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Put,
  Patch,
  Req,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UserHrSummaryResponseDto } from './dtos/user-hr-summary.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Scopes } from '../../auth/decorators/scopes.decorator';
import { UserRole } from './constants/role.enum';
import { Scope } from './constants/scope.enum';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import {
  OneUserResponseDto,
  AllUsersResponseDto,
} from './dtos/user-response.dto';
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';

@Controller('users')
@ApiTags('Platform SaaS - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({
    description: 'User successfully created',
    type: OneUserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Email already exists' })
  @ApiBody({ type: CreateUserDto })
  create(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<OneUserResponseDto> {
    return this.usersService.create(dto, req.user);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({
    description: 'List of all users',
    type: AllUsersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'No users found' })
  findAll(@Query() query: PaginationQueryDto): Promise<AllUsersResponseDto> {
    return this.usersService.findAll(query);
  }

  // Declared before ':id' so that 'company' is not parsed as a user id.
  @Get('company')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      "Get the users of every merchant in the authenticated user's company",
  })
  @ApiOkResponse({
    description: 'Users of the company, ordered by merchant',
    type: AllUsersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'The user has no company' })
  findByCompany(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<AllUsersResponseDto> {
    return this.usersService.findByCompany(req.user);
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
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({
    description: 'User found',
    type: OneUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<OneUserResponseDto> {
    return this.usersService.findOne(id, req.user);
  }

  @Get('merchant/:merchantId')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get users by Merchant ID' })
  @ApiOkResponse({
    description: 'Users filtered by merchant ID',
    type: AllUsersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Merchant or users not found' })
  findByMerchant(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    const currentUser = req.user;
    return this.usersService.findByMerchant(merchantId, currentUser);
  }

  @Get('email/:email')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get users by Email' })
  @ApiOkResponse({
    description: 'User found by email',
    type: OneUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findByEmail(
    @Param('email') email: string,
    @Req() req: Request & { user: AuthenticatedUser },
  ) {
    return this.usersService.findByEmail(email, req.user);
  }

  @Put(':id')
  // Any staff account may edit its own profile; the service decides what else it may touch.
  @Roles(
    UserRole.PORTAL_ADMIN,
    UserRole.PORTAL_USER,
    UserRole.MERCHANT_ADMIN,
    UserRole.MERCHANT_USER,
  )
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOkResponse({
    description: 'User updated successfully',
    type: OneUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<OneUserResponseDto> {
    const authenticatedUser = req.user;
    return this.usersService.update(id, dto, authenticatedUser);
  }

  @Patch(':id/status')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Activate or deactivate a user (soft, non-destructive)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({
    description: 'User status updated successfully',
    type: OneUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<OneUserResponseDto> {
    return this.usersService.setActiveStatus(id, dto.isActive, req.user);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Trigger a password reset email for a user (admin-initiated)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOkResponse({ description: 'Password reset link dispatched' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  triggerPasswordReset(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ statusCode: number; message: string }> {
    return this.usersService.triggerPasswordReset(id, req.user);
  }

  @Get(':id/hr-summary')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a user together with their linked HR collaborator records',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOkResponse({
    description: 'User HR summary found',
    type: UserHrSummaryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getHrSummary(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<UserHrSummaryResponseDto> {
    return this.usersService.getHrSummary(id, req.user);
  }
}
