import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReservationNoteService } from './reservation-note.service';
import { CreateReservationNoteDto } from './dto/create-reservation-note.dto';
import { UpdateReservationNoteDto } from './dto/update-reservation-note.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneReservationNoteResponse } from './dto/reservation-note-response.dto';
import { AllPaginatedReservationNotes } from './dto/all-paginated-reservation-notes.dto';
import { GetReservationNotesQueryDto } from './dto/get-reservation-notes-query.dto';

@ApiTags('Restaurant operations - Reservations - Notes')
@ApiBearerAuth()
@Controller('reservation-note')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.RESERVATION_NOTES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class ReservationNoteController {
  constructor(
    private readonly reservationNoteService: ReservationNoteService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Add a note to a reservation' })
  @ApiResponse({ status: 201, type: OneReservationNoteResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createNoteDto: CreateReservationNoteDto,
  ): Promise<OneReservationNoteResponse> {
    const creatorId = user.id;
    return this.reservationNoteService.create(
      { ...createNoteDto, created_by: creatorId },
      user.merchant.id,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all notes of the merchant' })
  @ApiResponse({ status: 200, type: AllPaginatedReservationNotes })
  findAllGlobal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: GetReservationNotesQueryDto,
  ): Promise<AllPaginatedReservationNotes> {
    return this.reservationNoteService.findAllGlobal(
      user.merchant.id,
      queryDto,
    );
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all notes of a reservation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: AllPaginatedReservationNotes })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AllPaginatedReservationNotes> {
    return this.reservationNoteService.findAll(
      reservationId,
      user.merchant.id,
      page,
      limit,
    );
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get a note by ID' })
  @ApiResponse({ status: 200, type: OneReservationNoteResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationNoteResponse> {
    return this.reservationNoteService.findOne(id, user.merchant.id);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Update note content' })
  @ApiResponse({ status: 200, type: OneReservationNoteResponse })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: UpdateReservationNoteDto,
  ): Promise<OneReservationNoteResponse> {
    return this.reservationNoteService.update(
      id,
      updateNoteDto,
      user.merchant.id,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Remove a note' })
  @ApiResponse({ status: 200, type: OneReservationNoteResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationNoteResponse> {
    return this.reservationNoteService.remove(id, user.merchant.id);
  }
}
