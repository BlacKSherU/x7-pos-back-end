import { ApiProperty } from '@nestjs/swagger';
import { DeviceType } from '../constants/device-type.constant';

export class PairingCodeResponseDto {
  @ApiProperty({
    example: '8FX2K9',
    description: '6-character ephemeral pairing code',
  })
  code: string;

  @ApiProperty({
    example: '2026-10-31T12:05:00Z',
    description: 'Expiration date and time',
  })
  expiresAt: Date;

  @ApiProperty({ example: 'kds', description: 'Device type being paired' })
  type: DeviceType;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: 'Bound station ID if KDS',
  })
  stationId: number | null;
}

export class DeviceSummaryDto {
  @ApiProperty({ example: 1, description: 'Device unique ID' })
  id: number;

  @ApiProperty({ example: 10, description: 'Merchant ID' })
  merchantId: number;

  @ApiProperty({ example: 'kds', description: 'Device type' })
  type: DeviceType;

  @ApiProperty({
    example: 2,
    nullable: true,
    description: 'Station ID if bound to station',
  })
  stationId: number | null;

  @ApiProperty({ example: 'Grill Station KDS 1', description: 'Device name' })
  name: string;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Paired timestamp',
  })
  pairedAt: Date;

  @ApiProperty({
    example: '2026-10-31T12:30:00Z',
    nullable: true,
    description: 'Last seen timestamp',
  })
  lastSeenAt: Date | null;
}

export class PairDeviceResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Long-lived JWT token issued to the physical device',
  })
  deviceToken: string;

  @ApiProperty({
    type: () => DeviceSummaryDto,
    description: 'Registered device summary',
  })
  device: DeviceSummaryDto;
}

export class EmployeePinSessionResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Short-lived JWT session token issued to the employee on the shared device',
  })
  sessionToken: string;

  @ApiProperty({ example: 15, description: 'Authenticated employee user ID' })
  userId: number;

  @ApiProperty({
    example: 'waiter@restaurant.com',
    description: 'Employee email',
  })
  email: string;

  @ApiProperty({ example: 'waiter', description: 'Restaurant shift position' })
  shiftRole: string | null;

  @ApiProperty({
    example: [15, 16, 21, 23],
    description: 'Authorized feature IDs under active company subscription',
  })
  authorizedFeatureIds: number[];

  @ApiProperty({
    example: 1,
    description: 'Device ID on which the session was authorized',
  })
  deviceId: number;
}
