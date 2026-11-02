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
import { PaymentTerminalsService } from './payment-terminals.service';
import { CreatePaymentTerminalDto } from './dto/create-payment-terminal.dto';
import { UpdatePaymentTerminalDto } from './dto/update-payment-terminal.dto';
import {
  AllPaymentTerminalsResponseDto,
  GetPaymentTerminalsQueryDto,
  OnePaymentTerminalResponseDto,
} from './dto/payment-terminal-response.dto';

// Lectura también desde las cajas (Android, iOS, Clover): eligen el terminal de su caja
const READ_SCOPES = [
  Scope.ADMIN_PORTAL,
  Scope.MERCHANT_WEB,
  Scope.MERCHANT_ANDROID,
  Scope.MERCHANT_IOS,
  Scope.MERCHANT_CLOVER,
];

@ApiTags('Payment Terminals')
@ApiBearerAuth()
@ApiParam({ name: 'companyId', type: Number, example: 1 })
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
@ApiForbiddenResponse({
  description: "Role/scope not allowed, or another company's data",
  type: ErrorResponse,
})
@Controller('v1/merchants/:companyId/payment-terminals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT_ADMIN)
@Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB)
export class PaymentTerminalsController {
  constructor(private readonly terminalsService: PaymentTerminalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a payment terminal',
    description:
      'Binds the hardware to an active payment config of the company (and optionally to a register / cash drawer of the branch). The device identifier is checked against the provider: HSN for CardPointe Bolt, reader ID (tmr_...) for Stripe.',
  })
  @ApiCreatedResponse({ type: OnePaymentTerminalResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, inactive payment config, or branch / register outside the company',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Payment config not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Device already registered on the payment config',
    type: ErrorResponse,
  })
  create(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: CreatePaymentTerminalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    return this.terminalsService.create(companyId, dto, user);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(...READ_SCOPES)
  @ApiOperation({
    summary: "List the company's payment terminals",
    description:
      'Branch users only see their own merchant. Filter by cashDrawerId to find the terminal of a register. Paginated only when page or limit is sent.',
  })
  @ApiOkResponse({ type: AllPaymentTerminalsResponseDto })
  findAll(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query() query: GetPaymentTerminalsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AllPaymentTerminalsResponseDto> {
    return this.terminalsService.findAll(companyId, query, user);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(...READ_SCOPES)
  @ApiOperation({ summary: 'Get a payment terminal' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OnePaymentTerminalResponseDto })
  @ApiNotFoundResponse({
    description: 'Payment terminal not found',
    type: ErrorResponse,
  })
  findOne(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    return this.terminalsService.findOne(companyId, id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a payment terminal',
    description:
      'Changing the payment config or branch, or reactivating the terminal, re-checks that the config exists and is active.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OnePaymentTerminalResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid payload or inactive payment config',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Payment terminal or config not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Device already registered on the payment config',
    type: ErrorResponse,
  })
  update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentTerminalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    return this.terminalsService.update(companyId, id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment terminal' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OnePaymentTerminalResponseDto })
  @ApiNotFoundResponse({
    description: 'Payment terminal not found',
    type: ErrorResponse,
  })
  remove(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTerminalResponseDto> {
    return this.terminalsService.remove(companyId, id, user);
  }
}
