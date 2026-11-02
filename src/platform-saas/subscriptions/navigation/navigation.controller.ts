import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { NavigationService } from './navigation.service';
import { GetNavigationQueryDto } from './dto/get-navigation-query.dto';
import { NavigationTreeResponseDto } from './dto/navigation-response.dto';

@ApiTags('Navigation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get('navigation')
  @ApiOperation({
    summary:
      'Retrieve dynamic multi-surface navigation tree filtered by plan, roles and overrides',
    description:
      'Returns a hierarchical navigation tree (categories -> applications -> items) filtered by user role, subscription plan, collaborator shift role and individual user feature overrides.',
  })
  @ApiResponse({
    status: 200,
    description: 'Navigation tree successfully calculated and returned',
    type: NavigationTreeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (missing or invalid surface query parameter)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (missing or invalid bearer token)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden (user role not permitted for requested navigation surface)',
  })
  async getNavigation(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetNavigationQueryDto,
  ): Promise<NavigationTreeResponseDto> {
    return this.navigationService.getNavigationTree(user, query.surface);
  }
}
