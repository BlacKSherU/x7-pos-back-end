import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ReceiptActor } from '../receipts/audit/receipt-audit.util';
import { ReceiptAdjustmentsService } from './receipt-adjustments.service';
import { CreateAdjustmentNoteDto } from './dto/create-adjustment-note.dto';
import {
  IssuedAdjustmentNoteResponseDto,
  ReceiptAdjustmentsResponseDto,
} from './dto/adjustment-note-response.dto';
import { ADJUSTMENT_REQUIRES_LOCK_MESSAGE } from './receipt-adjustments.util';

type AuthenticatedRequest = ExpressRequest & { user?: AuthenticatedUser };

/**
 * Notas de crédito / débito (Historia 7): POST y GET /api/billing/receipts/:id/adjustments.
 */
@ApiTags('Core - Billing transactions - Adjustment notes')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('billing/receipts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RECEIPTS)
export class ReceiptAdjustmentsController {
  constructor(private readonly adjustmentsService: ReceiptAdjustmentsService) {}

  private merchantIdOf(req: AuthenticatedRequest): number {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant for this operation',
      );
    }
    return merchantId;
  }

  private actorOf(req: AuthenticatedRequest): ReceiptActor {
    const user = req.user;
    if (!user?.id) {
      throw new ForbiddenException('An authenticated user is required');
    }
    return { id: user.id, role: user.role };
  }

  @Post(':id/adjustments')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Issue a credit / debit note for a locked receipt (Historia 7)',
    description: `Creates a compensating adjustment note that references the invoice_number of the receipt and records the delta and the resulting net liability; the original receipt is never modified. Only fiscally locked receipts accept notes (otherwise 400 "${ADJUSTMENT_REQUIRES_LOCK_MESSAGE}"). adjustmentAmount must be > 0 and ≤ the receipt grand_total, and all credit notes of the receipt together cannot exceed its grand_total. The authenticated user and role are stamped on the note and an ADJUSTMENT_ISSUED event is added to the receipt activity log.`,
  })
  @ApiParam({ name: 'id', type: Number, description: 'Receipt id' })
  @ApiBody({ type: CreateAdjustmentNoteDto })
  @ApiCreatedResponse({
    description: 'Adjustment note issued',
    type: IssuedAdjustmentNoteResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid data, receipt not locked, or amount above the grand_total / available credit',
    type: ErrorResponse,
  })
  @ApiConflictResponse({
    description: 'Concurrent note numbering conflict',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Receipt not found',
    type: ErrorResponse,
  })
  async issue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAdjustmentNoteDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<IssuedAdjustmentNoteResponseDto> {
    const merchantId = this.merchantIdOf(req);
    return this.adjustmentsService.issue(
      id,
      dto,
      this.actorOf(req),
      merchantId,
    );
  }

  @Get(':id/adjustments')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'List the adjustment notes of a receipt (Historia 7)',
    description:
      'Credit / debit notes of a receipt of the merchant in chronological order, with the net liability (grand_total − credits + debits) and the credit still available.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Receipt id' })
  @ApiOkResponse({
    description: 'Adjustment notes retrieved',
    type: ReceiptAdjustmentsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({
    description: 'Receipt not found',
    type: ErrorResponse,
  })
  async findForReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<ReceiptAdjustmentsResponseDto> {
    return this.adjustmentsService.findForReceipt(id, this.merchantIdOf(req));
  }
}
