import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NavCategory } from '../entities/nav-category.entity';
import { NavItem } from '../entities/nav-item.entity';
import { SubscriptionAccessService } from '../../../auth/subscription-access.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../users/constants/role.enum';
import { getAllSubscriptionFeatureIds } from '../../../common/subscription/subscription-feature-ids';
import { NavigationSurface } from './constants/navigation-surface.constant';
import {
  NavigationCategoryResponseDto,
  NavigationApplicationResponseDto,
  NavigationTreeResponseDto,
} from './dto/navigation-response.dto';

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavCategory)
    private readonly navCategoryRepo: Repository<NavCategory>,
    @InjectRepository(NavItem)
    private readonly navItemRepo: Repository<NavItem>,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  /**
   * Asserts whether the given user role is permitted to query the requested navigation surface.
   */
  private assertSurfaceAccess(
    surface: NavigationSurface,
    role: UserRole,
  ): void {
    const isSuperAdmin = role === UserRole.SUPER_ADMIN;
    const isPortalStaff =
      role === UserRole.PORTAL_ADMIN || role === UserRole.PORTAL_USER;
    const isMerchantStaff =
      role === UserRole.MERCHANT_ADMIN || role === UserRole.MERCHANT_USER;

    if (surface === NavigationSurface.SAAS_WEB) {
      if (!isSuperAdmin && !isPortalStaff) {
        throw new ForbiddenException(
          'User does not have access to the SaaS navigation surface',
        );
      }
      return;
    }

    // Surfaces: merchant_web, app_kds, app_waiter, app_cashier, app_host
    if (isPortalStaff && !isSuperAdmin) {
      throw new ForbiddenException(
        'Portal staff does not have direct access to merchant or floor navigation surfaces',
      );
    }

    if (!isSuperAdmin && !isMerchantStaff) {
      throw new ForbiddenException(
        'User does not have access to the requested navigation surface',
      );
    }
  }

  /**
   * Builds the complete, dynamically filtered navigation tree for the authenticated user and surface.
   */
  async getNavigationTree(
    user: AuthenticatedUser,
    surface: NavigationSurface,
  ): Promise<NavigationTreeResponseDto> {
    // 1. Verify access to the requested surface
    this.assertSurfaceAccess(surface, user.role);

    // 2. Resolve effective feature permissions and active plan
    let planId: number | null = null;
    let shiftRole: string | null = null;
    let authorizedFeatureSet: Set<number>;

    if (user.role === UserRole.SUPER_ADMIN) {
      planId = user.planId ?? 3;
      shiftRole = null;
      authorizedFeatureSet = new Set(getAllSubscriptionFeatureIds());
    } else if (
      user.role === UserRole.PORTAL_ADMIN ||
      user.role === UserRole.PORTAL_USER
    ) {
      planId = null;
      shiftRole = null;
      authorizedFeatureSet = new Set(getAllSubscriptionFeatureIds());
    } else {
      const effective =
        await this.subscriptionAccessService.calculateEffectiveFeatures(user);
      planId = effective.planId ?? null;
      shiftRole = effective.shiftRole;
      authorizedFeatureSet = new Set(effective.authorizedFeatureIds);
    }

    // 3. Query all categories, active applications and items for this surface in a single query
    const rawCategories = await this.navCategoryRepo
      .createQueryBuilder('category')
      .leftJoinAndSelect(
        'category.applications',
        'application',
        'application.status = :appStatus',
        { appStatus: 'active' },
      )
      .leftJoinAndSelect(
        'application.navItems',
        'navItem',
        'navItem.surface = :surface',
        { surface },
      )
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.id', 'ASC')
      .addOrderBy('application.sortOrder', 'ASC')
      .addOrderBy('application.id', 'ASC')
      .addOrderBy('navItem.sortOrder', 'ASC')
      .addOrderBy('navItem.id', 'ASC')
      .getMany();

    // 4. Cascade filter and prune empty applications & categories
    const visibleCategories: NavigationCategoryResponseDto[] = [];

    for (const cat of rawCategories) {
      const visibleApplications: NavigationApplicationResponseDto[] = [];

      for (const app of cat.applications || []) {
        const appItems = app.navItems || [];

        // 4a. Identify visible screen items
        const visibleScreens = appItems.filter((item) => {
          if (item.kind !== 'screen') return false;
          if (item.featureId === null || item.featureId === undefined) {
            return true;
          }
          return authorizedFeatureSet.has(Number(item.featureId));
        });

        // 4b. Identify visible hub items (visible if the application has at least one visible screen)
        const visibleHubs = appItems.filter((item) => {
          if (item.kind !== 'hub') return false;
          if (item.featureId !== null && item.featureId !== undefined) {
            return authorizedFeatureSet.has(Number(item.featureId));
          }
          return visibleScreens.length > 0;
        });

        // 4c. Combine and sort
        const combinedItems = [...visibleHubs, ...visibleScreens].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
        );

        if (combinedItems.length > 0) {
          visibleApplications.push({
            id: Number(app.id),
            code: app.code ?? null,
            name: app.name,
            icon: app.icon ?? null,
            sortOrder: app.sortOrder ?? 0,
            items: combinedItems.map((item) => ({
              id: Number(item.id),
              code: item.code,
              featureId: item.featureId ? Number(item.featureId) : null,
              label: item.label,
              icon: item.icon,
              description: item.description ?? null,
              route: item.route ?? null,
              kind: item.kind,
              status: item.status,
              sortOrder: item.sortOrder,
            })),
          });
        }
      }

      if (visibleApplications.length > 0) {
        visibleCategories.push({
          id: Number(cat.id),
          code: cat.code,
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          applications: visibleApplications,
        });
      }
    }

    return {
      surface,
      planId,
      role: user.role,
      shiftRole,
      categories: visibleCategories,
    };
  }
}
