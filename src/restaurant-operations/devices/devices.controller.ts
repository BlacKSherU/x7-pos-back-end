import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../platform-saas/users/constants/role.enum';
import { DevicesService } from './devices.service';
import { CreatePairingCodeDto } from './dto/create-pairing-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';
import { EmployeePinLoginDto } from './dto/employee-pin-login.dto';
import { SetUserPinDto } from './dto/set-user-pin.dto';
import {
  DeviceSummaryDto,
  EmployeePinSessionResponseDto,
  PairDeviceResponseDto,
  PairingCodeResponseDto,
} from './dto/devices-response.dto';

@ApiTags('Devices & Terminals')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @ApiOperation({
    summary:
      'Generate 6-character ephemeral pairing code for terminal hardware onboarding',
  })
  @ApiResponse({
    status: 201,
    description: 'Pairing code generated successfully (5-minute TTL)',
    type: PairingCodeResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Post('pairing-code')
  async createPairingCode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePairingCodeDto,
  ): Promise<PairingCodeResponseDto> {
    return this.devicesService.generatePairingCode(user, dto);
  }

  @ApiOperation({
    summary:
      'Exchange ephemeral pairing code for long-lived physical device token',
  })
  @ApiResponse({
    status: 200,
    description: 'Device successfully paired and token issued',
    type: PairDeviceResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @Post('pair')
  async pairDevice(@Body() dto: PairDeviceDto): Promise<PairDeviceResponseDto> {
    return this.devicesService.pairDevice(dto);
  }

  @ApiOperation({
    summary:
      'Authenticate employee on paired terminal using rapid 4-6 digit numeric PIN',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN authenticated and employee shift session token issued',
    type: EmployeePinSessionResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @Post('pin-session')
  async loginWithPin(
    @Body() dto: EmployeePinLoginDto,
  ): Promise<EmployeePinSessionResponseDto> {
    return this.devicesService.authenticateByPin(
      { deviceId: dto.deviceId },
      dto,
    );
  }

  @ApiOperation({
    summary:
      'Configure or update 4-6 digit numeric PIN for an employee account',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN successfully saved',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('users/:userId/pin')
  async setUserPin(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetUserPinDto,
  ): Promise<{ message: string }> {
    return this.devicesService.setUserPin(userId, currentUser, dto.pin);
  }

  @ApiOperation({
    summary:
      'List physical terminal devices registered to the current merchant branch',
  })
  @ApiResponse({
    status: 200,
    description: 'List of registered merchant devices',
    type: [DeviceSummaryDto],
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Get()
  async listDevices(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeviceSummaryDto[]> {
    return this.devicesService.listDevices(user.merchant.id);
  }

  @ApiOperation({
    summary: 'Revoke physical terminal device access',
  })
  @ApiResponse({
    status: 200,
    description: 'Device terminal access revoked',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Delete(':id')
  async revokeDevice(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.devicesService.revokeDevice(user.merchant.id, id);
  }
}
