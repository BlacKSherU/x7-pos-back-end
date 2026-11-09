// src/users/dtos/user-safe.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../constants/role.enum';
import { Scope } from '../constants/scope.enum';
import { Merchant } from '../../merchants/entities/merchant.entity';

export class UserSafeDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the User',
  })
  id: number;

  @ApiProperty({
    example: 'username123',
    description: 'Username of the User',
  })
  username: string;

  @ApiProperty({
    example: 'user@domain.com',
    description: 'Email of the User',
  })
  email: string;

  @ApiProperty({
    example: UserRole.MERCHANT_ADMIN,
    enum: UserRole,
    description: 'Role of the User',
  })
  role: UserRole;

  @ApiProperty({
    example: Scope.MERCHANT_WEB,
    enum: Scope,
    description: 'Scope of the User',
  })
  scope: Scope;

  @ApiProperty({
    example: true,
    description: 'Whether the user account is active',
  })
  isActive: boolean;

  @ApiProperty({
    example: 1,
    description: 'Merchant ID associated with the User',
  })
  merchantId: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the user',
    nullable: true,
  })
  merchant?: Merchant;

  @ApiProperty({
    example: 'waiter',
    description: 'Collaborator shift role if assigned',
    nullable: true,
    required: false,
  })
  shiftRole?: string | null;

  @ApiProperty({
    example: 'Manuel Mozo',
    description: 'Collaborator full name if assigned',
    nullable: true,
    required: false,
  })
  collaboratorName?: string | null;
}
