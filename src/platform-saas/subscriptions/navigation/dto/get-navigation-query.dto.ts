import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import {
  NavigationSurface,
  ALL_NAVIGATION_SURFACES,
} from '../constants/navigation-surface.constant';

export class GetNavigationQueryDto {
  @ApiProperty({
    example: 'merchant_web',
    description:
      'Target client surface (merchant_web, saas_web, app_kds, app_waiter, app_cashier, app_host)',
    enum: ALL_NAVIGATION_SURFACES,
    required: true,
  })
  @IsNotEmpty({ message: 'surface query parameter is required' })
  @IsString({ message: 'surface must be a string' })
  @IsIn(ALL_NAVIGATION_SURFACES, {
    message: `surface must be one of: ${ALL_NAVIGATION_SURFACES.join(', ')}`,
  })
  surface: NavigationSurface;
}
