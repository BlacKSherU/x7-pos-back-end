import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { MerchantDevice } from './entities/merchant-device.entity';
import { DevicePairingCode } from './entities/device-pairing-code.entity';
import { User } from '../../platform-saas/users/entities/user.entity';
import { KitchenStation } from '../kitchen-display-system/kitchen-station/entities/kitchen-station.entity';
import { Merchant } from '../../platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { SubscriptionAccessService } from '../../auth/subscription-access.service';
import { CreatePairingCodeDto } from './dto/create-pairing-code.dto';
import { PairDeviceDto } from './dto/pair-device.dto';
import { EmployeePinLoginDto } from './dto/employee-pin-login.dto';
import {
  DeviceSummaryDto,
  EmployeePinSessionResponseDto,
  PairDeviceResponseDto,
  PairingCodeResponseDto,
} from './dto/devices-response.dto';

interface PinAttemptRecord {
  count: number;
  lockedUntil: number;
}

@Injectable()
export class DevicesService {
  // In-memory brute force protection tracking per device/merchant
  private readonly failedAttempts = new Map<string, PinAttemptRecord>();

  constructor(
    @InjectRepository(MerchantDevice)
    private readonly deviceRepository: Repository<MerchantDevice>,
    @InjectRepository(DevicePairingCode)
    private readonly pairingCodeRepository: Repository<DevicePairingCode>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KitchenStation)
    private readonly stationRepository: Repository<KitchenStation>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly jwtService: JwtService,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  /**
   * Generates a 6-character ephemeral pairing code (5 min TTL) for physical terminal onboarding.
   */
  async generatePairingCode(
    currentUser: AuthenticatedUser,
    dto: CreatePairingCodeDto,
  ): Promise<PairingCodeResponseDto> {
    const merchantId = currentUser.merchant.id;

    // Validate station if provided
    if (dto.stationId) {
      const station = await this.stationRepository.findOne({
        where: { id: dto.stationId, merchant_id: merchantId },
      });
      if (!station) {
        throw new NotFoundException(
          `Kitchen station ${dto.stationId} not found for this branch`,
        );
      }
    }

    // Generate unambiguous 6-character uppercase alphanumeric code
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomBytes = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += charset[randomBytes[i] % charset.length];
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL

    const pairingRecord = this.pairingCodeRepository.create({
      code_hash: codeHash,
      merchant_id: merchantId,
      type: dto.type,
      station_id: dto.stationId ?? null,
      expires_at: expiresAt,
      created_by: currentUser.id,
    });

    await this.pairingCodeRepository.save(pairingRecord);

    return {
      code,
      expiresAt,
      type: dto.type,
      stationId: dto.stationId ?? null,
    };
  }

  /**
   * Exchanges an ephemeral pairing code for a long-lived terminal device token.
   */
  async pairDevice(dto: PairDeviceDto): Promise<PairDeviceResponseDto> {
    const codeHash = crypto
      .createHash('sha256')
      .update(dto.code.trim().toUpperCase())
      .digest('hex');

    const pairingRecord = await this.pairingCodeRepository.findOne({
      where: { code_hash: codeHash },
      relations: ['merchant'],
    });

    if (!pairingRecord) {
      throw new BadRequestException('Invalid pairing code.');
    }

    if (pairingRecord.used_at) {
      throw new BadRequestException('This pairing code has already been used.');
    }

    if (new Date() > pairingRecord.expires_at) {
      throw new BadRequestException(
        'Pairing code has expired. Please generate a new one.',
      );
    }

    // Generate unique device secret and device token
    const deviceSecret = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(deviceSecret)
      .digest('hex');

    const merchantDevice = this.deviceRepository.create({
      merchant_id: pairingRecord.merchant_id,
      type: pairingRecord.type,
      station_id: pairingRecord.station_id,
      name: dto.deviceName.trim(),
      token_hash: tokenHash,
      paired_at: new Date(),
      last_seen_at: new Date(),
    });

    const savedDevice = await this.deviceRepository.save(merchantDevice);

    // Mark pairing code as claimed
    pairingRecord.used_at = new Date();
    await this.pairingCodeRepository.save(pairingRecord);

    // Issue long-lived device JWT
    const payload = {
      sub: `device_${savedDevice.id}`,
      deviceId: savedDevice.id,
      merchantId: savedDevice.merchant_id,
      stationId: savedDevice.station_id,
      type: savedDevice.type,
      scope: savedDevice.type === 'kds' ? 'kitchen_device' : 'merchant_android',
      secret: deviceSecret,
    };

    const deviceToken = this.jwtService.sign(payload, { expiresIn: '365d' });

    const deviceSummary: DeviceSummaryDto = {
      id: savedDevice.id,
      merchantId: savedDevice.merchant_id,
      type: savedDevice.type,
      stationId: savedDevice.station_id,
      name: savedDevice.name,
      pairedAt: savedDevice.paired_at,
      lastSeenAt: savedDevice.last_seen_at,
    };

    return {
      deviceToken,
      device: deviceSummary,
    };
  }

  /**
   * Fast employee PIN session authentication on paired terminal devices.
   */
  async authenticateByPin(
    authHeaderOrDeviceContext: { deviceId?: number; merchantId?: number },
    dto: EmployeePinLoginDto,
  ): Promise<EmployeePinSessionResponseDto> {
    const deviceId = dto.deviceId ?? authHeaderOrDeviceContext.deviceId;
    if (!deviceId) {
      throw new BadRequestException(
        'Device identifier is required to establish PIN session.',
      );
    }

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
    });

    if (!device || device.revoked_at) {
      throw new UnauthorizedException(
        'Device terminal is revoked or unregistered.',
      );
    }

    // Check rate limit and brute-force lockout
    const lockKey = `device_${deviceId}`;
    const now = Date.now();
    const attempt = this.failedAttempts.get(lockKey);

    if (attempt && attempt.lockedUntil > now) {
      const remainingMinutes = Math.ceil((attempt.lockedUntil - now) / 60000);
      throw new UnauthorizedException(
        `Too many consecutive failed attempts. Device is locked for ${remainingMinutes} more minute(s).`,
      );
    }

    // Fetch active users of this merchant branch with a configured PIN
    const merchantUsers = await this.userRepository.find({
      where: { merchantId: device.merchant_id, isActive: true },
      relations: ['merchant'],
    });

    const candidateUsers = merchantUsers.filter((u) => Boolean(u.pinHash));

    let matchedUser: User | null = null;
    for (const user of candidateUsers) {
      if (user.pinHash) {
        const isMatch = await bcrypt.compare(dto.pin, user.pinHash);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      const currentCount = (attempt?.count ?? 0) + 1;
      if (currentCount >= 5) {
        // Lock for 5 minutes
        this.failedAttempts.set(lockKey, {
          count: currentCount,
          lockedUntil: now + 5 * 60 * 1000,
        });
        throw new UnauthorizedException(
          'Maximum failed PIN attempts exceeded. Device locked for 5 minutes.',
        );
      } else {
        this.failedAttempts.set(lockKey, {
          count: currentCount,
          lockedUntil: 0,
        });
        throw new UnauthorizedException(
          `Invalid employee PIN. Attempt ${currentCount} of 5.`,
        );
      }
    }

    // Reset attempt counter on success
    this.failedAttempts.delete(lockKey);

    // Update terminal activity timestamp
    device.last_seen_at = new Date();
    await this.deviceRepository.save(device);

    // Calculate effective permissions in real-time
    const effectiveAccess =
      await this.subscriptionAccessService.calculateEffectiveFeatures(
        matchedUser,
      );

    // Issue short-lived employee shift session JWT (12 hours)
    const sessionPayload = {
      sub: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role,
      scope: matchedUser.scope,
      shiftRole: effectiveAccess.shiftRole,
      collaboratorId: effectiveAccess.collaboratorId,
      authorizedFeatureIds: effectiveAccess.authorizedFeatureIds,
      deviceId: device.id,
      merchantId: device.merchant_id,
      stationId: device.station_id,
    };

    const sessionToken = this.jwtService.sign(sessionPayload, {
      expiresIn: '12h',
    });

    return {
      sessionToken,
      userId: matchedUser.id,
      email: matchedUser.email,
      shiftRole: effectiveAccess.shiftRole ?? null,
      authorizedFeatureIds: effectiveAccess.authorizedFeatureIds,
      deviceId: device.id,
    };
  }

  /**
   * Sets or updates employee personal PIN for fast terminal access.
   */
  async setUserPin(
    targetUserId: number,
    currentUser: AuthenticatedUser,
    pin: string,
  ): Promise<{ message: string }> {
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User ${targetUserId} not found.`);
    }

    // Tenant isolation: cannot modify user of another merchant
    if (targetUser.merchantId !== currentUser.merchant.id) {
      throw new ForbiddenException(
        'Access denied to user of another merchant.',
      );
    }

    const pinHash = await bcrypt.hash(pin.trim(), 10);
    targetUser.pinHash = pinHash;
    await this.userRepository.save(targetUser);

    return { message: 'Employee PIN successfully configured.' };
  }

  /**
   * Lists physical devices registered to the merchant.
   */
  async listDevices(merchantId: number): Promise<DeviceSummaryDto[]> {
    const devices = await this.deviceRepository.find({
      where: { merchant_id: merchantId },
      order: { created_at: 'DESC' },
    });

    return devices.map((d) => ({
      id: d.id,
      merchantId: d.merchant_id,
      type: d.type,
      stationId: d.station_id,
      name: d.name,
      pairedAt: d.paired_at,
      lastSeenAt: d.last_seen_at,
    }));
  }

  /**
   * Revokes a device terminal, preventing further sessions.
   */
  async revokeDevice(
    merchantId: number,
    deviceId: number,
  ): Promise<{ message: string }> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, merchant_id: merchantId },
    });

    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found.`);
    }

    device.revoked_at = new Date();
    await this.deviceRepository.save(device);

    return { message: 'Device terminal access revoked.' };
  }
}
