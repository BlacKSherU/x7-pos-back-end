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
import { TipPoolsService } from './tip-pools.service';
import { CreateTipPoolDto } from './dto/create-tip-pool.dto';
import { UpdateTipPoolDto } from './dto/update-tip-pool.dto';
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
import { OneTipPoolResponseDto, PaginatedTipPoolResponseDto } from './dto/tip-pool-response.dto';
import { GetTipPoolQueryDto } from './dto/get-tip-pool-query.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Tip Pools')
@ApiBearerAuth()
@Controller('tip-pools')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipPoolsController {
  constructor(private readonly tipPoolsService: TipPoolsService) {}

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @ApiOperation({ summary: 'Create a new Tip Pool' })
  @ApiCreatedResponse({ description: 'Tip pool created successfully', type: OneTipPoolResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBody({ type: CreateTipPoolDto })
  async create(@Body() dto: CreateTipPoolDto, @Request() req: any) {
    return this.tipPoolsService.create(dto, req.user?.merchant?.id);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @ApiOperation({ summary: 'Get all Tip Pools with pagination and filters' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'companyId', required: false }) @ApiQuery({ name: 'shiftId', required: false })
  @ApiQuery({ name: 'distributionType', required: false }) @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'createdDate', required: false }) @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ type: PaginatedTipPoolResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async findAll(@Query() query: GetTipPoolQueryDto, @Request() req: any) {
    return this.tipPoolsService.findAll(query, req.user?.merchant?.id);
  }

  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @ApiOperation({ summary: 'Get a Tip Pool by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tipPoolsService.findOne(id, req.user?.merchant?.id);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @ApiOperation({ summary: 'Update a Tip Pool by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiBody({ type: UpdateTipPoolDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTipPoolDto, @Request() req: any) {
    return this.tipPoolsService.update(id, dto, req.user?.merchant?.id);
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @ApiOperation({ summary: 'Soft delete a Tip Pool by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneTipPoolResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiConflictResponse({ type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tipPoolsService.remove(id, req.user?.merchant?.id);
  }
}
