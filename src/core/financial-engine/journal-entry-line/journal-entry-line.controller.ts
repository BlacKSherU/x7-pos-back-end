import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JournalEntryLineService } from './journal-entry-line.service';
import { CreateJournalEntryLineDto } from './dto/create-journal-entry-line.dto';
import { UpdateJournalEntryLineDto } from './dto/update-journal-entry-line.dto';
import { GetJournalEntryLinesQueryDto } from './dto/get-journal-entry-lines-query.dto';
import { AllPaginatedJournalEntryLines } from './dto/all-paginated-journal-entry-lines.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  JournalEntryLineResponseDto,
  OneJournalEntryLineResponse,
} from './dto/journal-entry-line-response.dto';

@ApiTags('Journal Entry Lines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
@Scopes(Scope.MERCHANT_WEB)
@Controller('journal-entries/:entryId/lines')
export class JournalEntryLineController {
  constructor(
    private readonly journalEntryLineService: JournalEntryLineService,
  ) {}

  // ─── POST /journal-entries/:entryId/lines ─────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Add a new line to a DRAFT journal entry' })
  @ApiParam({ name: 'entryId', type: Number, description: 'Journal Entry ID' })
  @ApiCreatedResponse({ type: OneJournalEntryLineResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Entry not in DRAFT or validation error',
  })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Body() dto: CreateJournalEntryLineDto,
  ) {
    return this.journalEntryLineService.create(user.merchant.id, entryId, dto);
  }

  // ─── GET /journal-entries/:entryId/lines ──────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all lines for a journal entry (paginated)' })
  @ApiParam({ name: 'entryId', type: Number, description: 'Journal Entry ID' })
  @ApiOkResponse({ type: AllPaginatedJournalEntryLines })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Query() query: GetJournalEntryLinesQueryDto,
  ) {
    return this.journalEntryLineService.findAllByEntry(
      query,
      user.merchant.id,
      entryId,
    );
  }

  // ─── GET /journal-entries/:entryId/lines/:id ──────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single journal entry line' })
  @ApiParam({ name: 'entryId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OneJournalEntryLineResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalEntryLineService.findOne(user.merchant.id, id);
  }

  // ─── PATCH /journal-entries/:entryId/lines/:id ────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a journal entry line',
    description:
      'Only lines belonging to DRAFT journal entries can be updated.',
  })
  @ApiParam({ name: 'entryId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({ type: OneJournalEntryLineResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Entry not in DRAFT',
  })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJournalEntryLineDto,
  ) {
    return this.journalEntryLineService.update(user.merchant.id, id, dto);
  }

  // ─── DELETE /journal-entries/:entryId/lines/:id ───────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a journal entry line',
    description:
      'Only lines belonging to DRAFT journal entries can be deleted.',
  })
  @ApiParam({ name: 'entryId', type: Number })
  @ApiParam({ name: 'id', type: Number })
  @ApiCreatedResponse({ type: OneJournalEntryLineResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Entry not in DRAFT',
  })
  @ApiNotFoundResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalEntryLineService.remove(user.merchant.id, id);
  }
}
