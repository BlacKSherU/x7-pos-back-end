import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFeatureOverrideItemDto {
  @ApiProperty({ example: 66, description: 'Unique identifier of the feature' })
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  featureId: number;

  @ApiProperty({
    example: 'allow',
    description: 'Override effect: inherit (remove override), allow, or deny',
    enum: ['inherit', 'allow', 'deny'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['inherit', 'allow', 'deny'], {
    message: 'effect must be inherit, allow, or deny',
  })
  effect: 'inherit' | 'allow' | 'deny';
}

export class UpdateFeatureOverridesDto {
  @ApiProperty({
    type: [UpdateFeatureOverrideItemDto],
    description: 'List of feature overrides to persist or remove',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFeatureOverrideItemDto)
  overrides: UpdateFeatureOverrideItemDto[];
}

export class UserFeatureItemDto {
  @ApiProperty({ example: 66, description: 'Feature ID' })
  featureId: number;

  @ApiProperty({
    example: 'cash-drawers',
    description: 'Feature or item slug code',
  })
  code: string;

  @ApiProperty({
    example: 'Cash Drawers',
    description: 'Display name of feature',
  })
  name: string;

  @ApiProperty({ example: 10, description: 'Application ID' })
  applicationId: number;

  @ApiProperty({
    example: 'Cash Drawers',
    description: 'Application display name',
  })
  applicationName: string;

  @ApiProperty({ example: 1, description: 'Navigation Category ID' })
  categoryId: number;

  @ApiProperty({
    example: 'Restaurant Operations',
    description: 'Navigation Category display name',
  })
  categoryName: string;

  @ApiProperty({
    example: false,
    description:
      'Whether the collaborator base ShiftRole has this feature enabled by default',
  })
  basePermission: boolean;

  @ApiProperty({
    example: 'inherit',
    description: 'Current override state (inherit, allow, deny)',
    enum: ['inherit', 'allow', 'deny'],
  })
  override: 'inherit' | 'allow' | 'deny';

  @ApiProperty({
    example: true,
    description:
      'Effective access state after applying base permission and override',
  })
  effective: boolean;

  @ApiProperty({
    example: 1,
    description: 'ID of user who granted/updated the override',
    nullable: true,
  })
  grantedBy: number | null;

  @ApiProperty({
    example: '2026-10-31T12:00:00Z',
    description: 'Timestamp when the override was granted/updated',
    nullable: true,
  })
  updatedAt: string | null;
}

export class UserFeatureOverridesResponseDto {
  @ApiProperty({ example: 42, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 'john_waiter', description: 'Username' })
  username: string;

  @ApiProperty({ example: 'john@restaurant.com', description: 'User email' })
  email: string;

  @ApiProperty({
    example: 'waiter',
    description:
      'Assigned collaborator shift role (null if not an operational staff user)',
    nullable: true,
  })
  shiftRole: string | null;

  @ApiProperty({
    example: 1,
    description: 'Company ID to which the user belongs',
  })
  companyId: number;

  @ApiProperty({
    example: 2,
    description: 'Active subscription plan ID of the company',
    nullable: true,
  })
  planId: number | null;

  @ApiProperty({
    type: [UserFeatureItemDto],
    description:
      'Hierarchical list of features available in company plan with user overrides',
  })
  features: UserFeatureItemDto[];
}
