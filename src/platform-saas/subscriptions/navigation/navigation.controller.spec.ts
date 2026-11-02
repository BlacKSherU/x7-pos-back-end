import { Test, TestingModule } from '@nestjs/testing';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';
import { NavigationSurface } from './constants/navigation-surface.constant';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../users/constants/role.enum';
import { Scope } from '../../users/constants/scope.enum';
import { NavigationTreeResponseDto } from './dto/navigation-response.dto';

describe('NavigationController', () => {
  let controller: NavigationController;
  let service: jest.Mocked<NavigationService>;

  const mockUser: AuthenticatedUser = {
    id: 1,
    email: 'admin@merchant.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1, companyId: 1 },
    planId: 2,
    authorizedFeatureIds: [45, 66],
    shiftRole: null,
  };

  const mockTreeResponse: NavigationTreeResponseDto = {
    surface: NavigationSurface.MERCHANT_WEB,
    planId: 2,
    role: UserRole.MERCHANT_ADMIN,
    shiftRole: null,
    categories: [
      {
        id: 1,
        code: 'restaurant-operations',
        name: 'Restaurant Operations',
        icon: 'restaurant',
        sortOrder: 1,
        applications: [
          {
            id: 1,
            code: 'cash-drawers',
            name: 'Cash Drawers',
            icon: 'point_of_sale',
            sortOrder: 1,
            items: [
              {
                id: 1,
                code: 'cash-drawers',
                featureId: 66,
                label: 'CASH DRAWERS',
                icon: 'point_of_sale',
                description: 'Cajones y su saldo',
                route: '/store-operations/cash-drawers',
                kind: 'screen',
                status: 'live',
                sortOrder: 1,
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockService = {
      getNavigationTree: jest.fn().mockResolvedValue(mockTreeResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NavigationController],
      providers: [
        {
          provide: NavigationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NavigationController>(NavigationController);
    service = module.get(NavigationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return navigation tree for valid surface', async () => {
    const result = await controller.getNavigation(mockUser, {
      surface: NavigationSurface.MERCHANT_WEB,
    });

    expect(result).toEqual(mockTreeResponse);
    expect(service.getNavigationTree).toHaveBeenCalledWith(
      mockUser,
      NavigationSurface.MERCHANT_WEB,
    );
  });
});
