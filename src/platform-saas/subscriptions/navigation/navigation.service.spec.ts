import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { NavigationService } from './navigation.service';
import { NavCategory } from '../entities/nav-category.entity';
import { NavItem } from '../entities/nav-item.entity';
import { SubscriptionAccessService } from '../../../auth/subscription-access.service';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../users/constants/role.enum';
import { Scope } from '../../users/constants/scope.enum';
import { NavigationSurface } from './constants/navigation-surface.constant';

describe('NavigationService', () => {
  let service: NavigationService;
  let mockCategoryRepo: { createQueryBuilder: jest.Mock };
  let mockSubscriptionAccessService: { calculateEffectiveFeatures: jest.Mock };

  beforeEach(async () => {
    mockCategoryRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockSubscriptionAccessService = {
      calculateEffectiveFeatures: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavigationService,
        {
          provide: getRepositoryToken(NavCategory),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(NavItem),
          useValue: {},
        },
        {
          provide: SubscriptionAccessService,
          useValue: mockSubscriptionAccessService,
        },
      ],
    }).compile();

    service = module.get<NavigationService>(NavigationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assertSurfaceAccess', () => {
    it('should throw ForbiddenException when merchant user requests saas_web', async () => {
      const merchantUser: AuthenticatedUser = {
        id: 1,
        email: 'staff@merchant.com',
        role: UserRole.MERCHANT_USER,
        scope: Scope.MERCHANT_WEB,
        merchant: { id: 1, companyId: 1 },
      };

      await expect(
        service.getNavigationTree(merchantUser, NavigationSurface.SAAS_WEB),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when portal admin requests merchant_web', async () => {
      const portalUser: AuthenticatedUser = {
        id: 2,
        email: 'admin@saas.com',
        role: UserRole.PORTAL_ADMIN,
        scope: Scope.ADMIN_PORTAL,
        merchant: { id: 1 },
      };

      await expect(
        service.getNavigationTree(portalUser, NavigationSurface.MERCHANT_WEB),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getNavigationTree filtering and pruning', () => {
    it('should prune applications and categories that have no visible items', async () => {
      const user: AuthenticatedUser = {
        id: 1,
        email: 'admin@merchant.com',
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
        merchant: { id: 1, companyId: 1 },
      };

      mockSubscriptionAccessService.calculateEffectiveFeatures.mockResolvedValue({
        planId: 1,
        authorizedFeatureIds: [66], // only Cash Drawers
        shiftRole: null,
      });

      const mockData = [
        {
          id: 1,
          code: 'restaurant-operations',
          name: 'Restaurant Operations',
          icon: 'restaurant',
          sortOrder: 1,
          applications: [
            {
              id: 10,
              code: 'cash-drawers',
              name: 'Cash Drawers',
              icon: 'point_of_sale',
              sortOrder: 1,
              navItems: [
                {
                  id: 100,
                  kind: 'hub',
                  featureId: null,
                  code: 'cash-drawers-hub',
                  label: 'HUB',
                  icon: 'hub',
                  sortOrder: 0,
                  status: 'live',
                },
                {
                  id: 101,
                  kind: 'screen',
                  featureId: 66,
                  code: 'cash-drawers',
                  label: 'CASH DRAWERS',
                  icon: 'point_of_sale',
                  sortOrder: 1,
                  status: 'live',
                },
              ],
            },
            {
              id: 11,
              code: 'dining-system',
              name: 'Dining System',
              icon: 'table_restaurant',
              sortOrder: 2,
              navItems: [
                {
                  id: 102,
                  kind: 'screen',
                  featureId: 999, // unauthorized
                  code: 'floor-plans',
                  label: 'FLOOR PLANS',
                  icon: 'layers',
                  sortOrder: 1,
                  status: 'live',
                },
              ],
            },
          ],
        },
      ];

      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };
      mockCategoryRepo.createQueryBuilder.mockReturnValue(qb);

      const tree = await service.getNavigationTree(
        user,
        NavigationSurface.MERCHANT_WEB,
      );

      expect(tree.categories).toHaveLength(1);
      expect(tree.categories[0].applications).toHaveLength(1);
      expect(tree.categories[0].applications[0].code).toBe('cash-drawers');
      expect(tree.categories[0].applications[0].items).toHaveLength(2);
    });
  });
});
