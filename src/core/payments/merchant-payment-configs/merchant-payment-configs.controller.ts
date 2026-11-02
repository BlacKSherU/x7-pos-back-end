import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { MerchantPaymentConfigsService } from './merchant-payment-configs.service';
import { CreateMerchantPaymentConfigDto } from './dto/create-merchant-payment-config.dto';
import { UpdateMerchantPaymentConfigDto } from './dto/update-merchant-payment-config.dto';
import {
  AllMerchantPaymentConfigsResponseDto,
  GetMerchantPaymentConfigsQueryDto,
  OneMerchantPaymentConfigResponseDto,
} from './dto/merchant-payment-config-response.dto';

@ApiTags('Merchant Payment Configs')
@ApiBearerAuth()
@ApiParam({ name: 'companyId', type: Number, example: 1 })
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
@ApiForbiddenResponse({
  description: "Role/scope not allowed, or another company's data",
  type: ErrorResponse,
})
@Controller('v1/merchants/:companyId/payment-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
// Credenciales de pago: solo administradores, desde el portal o el backoffice web
@Roles(UserRole.MERCHANT_ADMIN)
@Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB)
export class MerchantPaymentConfigsController {
  constructor(private readonly configsService: MerchantPaymentConfigsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a payment gateway config',
    description:
      'Validates the credentials for the provider, encrypts them (AES-256-GCM) and stores the config. Setting isDefault unsets the previous default of the company; the first active config becomes the default when isDefault is omitted.',
  })
  @ApiCreatedResponse({ type: OneMerchantPaymentConfigResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid payload or credentials',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Company not found',
    type: ErrorResponse,
  })
  create(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: CreateMerchantPaymentConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    return this.configsService.create(companyId, dto, user);
  }

  @Get()
  @ApiOperation({
    summary: "List the company's payment gateway configs",
    description:
      'Secret credential values are masked (e.g. sk_test_****1234). Paginated only when page or limit is sent.',
  })
  @ApiOkResponse({ type: AllMerchantPaymentConfigsResponseDto })
  findAll(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: GetMerchantPaymentConfigsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AllMerchantPaymentConfigsResponseDto> {
    return this.configsService.findAll(companyId, query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a payment gateway config (secrets masked)',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OneMerchantPaymentConfigResponseDto })
  @ApiNotFoundResponse({
    description: 'Payment config not found',
    type: ErrorResponse,
  })
  findOne(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    return this.configsService.findOne(companyId, id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment gateway config',
    description:
      'credentials are merged into the stored ones and re-validated. The provider cannot change. Deactivating the default config unsets it as default.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OneMerchantPaymentConfigResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid payload or credentials',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Payment config not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Terminals of other branches use the config',
    type: ErrorResponse,
  })
  update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantPaymentConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    return this.configsService.update(companyId, id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment gateway config' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OneMerchantPaymentConfigResponseDto })
  @ApiNotFoundResponse({
    description: 'Payment config not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Terminals are still bound to the config',
    type: ErrorResponse,
  })
  remove(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OneMerchantPaymentConfigResponseDto> {
    return this.configsService.remove(companyId, id, user);
  }
}
