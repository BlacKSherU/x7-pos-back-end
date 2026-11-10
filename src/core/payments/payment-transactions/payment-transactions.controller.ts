import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
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
import { PaymentTransactionsService } from './payment-transactions.service';
import {
  ChargeDto,
  RefundTransactionDto,
  TerminalSaleDto,
  VoidTransactionDto,
} from './dto/charge.dto';
import {
  OnePaymentTransactionResponseDto,
  RefundVoidResponseDto,
} from './dto/payment-transaction-response.dto';
import {
  CheckoutOptionsResponseDto,
  ListPaymentTransactionsQueryDto,
  PaymentTransactionsPageDto,
} from './dto/list-payment-transactions.dto';

const MERCHANT_SCOPES = [
  Scope.ADMIN_PORTAL,
  Scope.MERCHANT_WEB,
  Scope.MERCHANT_ANDROID,
  Scope.MERCHANT_IOS,
  Scope.MERCHANT_CLOVER,
];

@ApiTags('Payment Processing')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
@ApiForbiddenResponse({
  description: 'Role/scope not allowed, or another branch data',
  type: ErrorResponse,
})
@Controller('v1/payment-processing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
@Scopes(...MERCHANT_SCOPES)
export class PaymentTransactionsController {
  constructor(
    private readonly transactionsService: PaymentTransactionsService,
  ) {}

  @Post('charge')
  @ApiOperation({
    summary: 'Charge a card token for an order',
    description:
      "Charges a token generated on the client (CardSecure / Stripe PaymentMethod) through the company's default payment config, or the one of paymentProvider. Raw card numbers or CVV are rejected. Every attempt is stored in payment_transactions; an approved charge is recorded as an order payment and the order becomes PAID once its balance is covered. A declined charge also answers 201, with data.status = failed.",
  })
  @ApiCreatedResponse({ type: OnePaymentTransactionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid payload (raw card data, amount above the balance due) or no payment config',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({ description: 'Order not found', type: ErrorResponse })
  @ApiConflictResponse({
    description: 'Order already paid',
    type: ErrorResponse,
  })
  charge(
    @Body() dto: ChargeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    return this.transactionsService.charge(dto, user);
  }

  @Post('terminal-sale')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Send a payment prompt to a physical terminal',
    description:
      'Dispatches the charge to the registered terminal (CardPointe Bolt / Stripe reader) through the cloud gateway API and answers at once with a pending transaction. Poll GET /payment-processing/:transactionId until the status is paid or failed.',
  })
  @ApiAcceptedResponse({ type: OnePaymentTransactionResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, inactive terminal or amount above the balance due',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Order or payment terminal not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Order already paid, or the terminal is busy with another sale',
    type: ErrorResponse,
  })
  terminalSale(
    @Body() dto: TerminalSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    return this.transactionsService.terminalSale(dto, user);
  }

  @Get('checkout-options')
  @ApiOperation({
    summary: 'Payment options of the branch for the checkout screen',
    description:
      'Active payment configs the branch can charge through (with the public values the browser needs to tokenize the card: Stripe.js publishable key or the CardSecure iFrame URL; never secrets) and its active terminals.',
  })
  @ApiOkResponse({ type: CheckoutOptionsResponseDto })
  checkoutOptions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutOptionsResponseDto> {
    return this.transactionsService.checkoutOptions(user);
  }

  @Get()
  @ApiOperation({
    summary: 'List the payment transactions of the branch',
    description:
      'Sales, refunds and voids, newest first. Filter by orderId, type or status.',
  })
  @ApiOkResponse({ type: PaymentTransactionsPageDto })
  findAll(
    @Query() query: ListPaymentTransactionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentTransactionsPageDto> {
    return this.transactionsService.findAll(query, user);
  }

  @Get(':transactionId')
  @ApiOperation({
    summary: 'Get a payment transaction',
    description:
      'A pending sale is first checked with the provider, so polling this endpoint moves a terminal sale from pending to paid or failed.',
  })
  @ApiParam({ name: 'transactionId', type: Number, example: 12 })
  @ApiOkResponse({ type: OnePaymentTransactionResponseDto })
  @ApiNotFoundResponse({
    description: 'Transaction not found',
    type: ErrorResponse,
  })
  findOne(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OnePaymentTransactionResponseDto> {
    return this.transactionsService.findOne(transactionId, user);
  }

  @Post(':transactionId/refund')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refund a paid transaction (total or partial)',
    description:
      'Store managers only (merchant admin, or merchant user whose shift role is manager). Without amount, the whole remaining balance is refunded. Refunds add up on the sale (partially_refunded → refunded); a fully refunded or voided sale is locked. The order gets a refund payment and its original payment is marked partially_refunded / refunded.',
  })
  @ApiParam({ name: 'transactionId', type: Number, example: 12 })
  @ApiOkResponse({ type: RefundVoidResponseDto })
  @ApiBadRequestResponse({
    description: 'Amount above what is still refundable',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Transaction not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Transaction already voided / fully refunded, not paid, or a void is in progress',
    type: ErrorResponse,
  })
  refund(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() dto: RefundTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundVoidResponseDto> {
    return this.transactionsService.refund(transactionId, dto, user);
  }

  @Post(':transactionId/void')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Void a paid transaction before batch closure',
    description:
      'Store managers only. Only a paid sale without refunds can be voided; after settlement the gateway declines the void and a refund is needed. The order payment is marked voided and stops counting as paid.',
  })
  @ApiParam({ name: 'transactionId', type: Number, example: 12 })
  @ApiOkResponse({ type: RefundVoidResponseDto })
  @ApiNotFoundResponse({
    description: 'Transaction not found',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description:
      'Transaction already voided / fully refunded, has refunds, or is not paid',
    type: ErrorResponse,
  })
  void(
    @Param('transactionId', ParseIntPipe) transactionId: number,
    @Body() dto: VoidTransactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RefundVoidResponseDto> {
    return this.transactionsService.void(transactionId, dto, user);
  }
}
