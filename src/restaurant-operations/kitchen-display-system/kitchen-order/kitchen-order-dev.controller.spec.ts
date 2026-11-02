import { ForbiddenException } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { KitchenOrderDevController } from './kitchen-order-dev.controller';
import { KitchenOrderService } from './kitchen-order.service';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

describe('KitchenOrderDevController', () => {
  const kitchenOrderService = { resetTestData: jest.fn() };
  const controller = new KitchenOrderDevController(
    kitchenOrderService as unknown as KitchenOrderService,
  );

  beforeEach(() => kitchenOrderService.resetTestData.mockReset());

  it('answers 403 for a user without a merchant (it used merchant 2)', async () => {
    const noMerchant = {
      user: { id: 1, merchant: undefined },
    } as unknown as AuthenticatedRequest;

    await expect(
      controller.resetTestData(noMerchant, { mode: 'seed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(kitchenOrderService.resetTestData).not.toHaveBeenCalled();
  });

  it('is limited to admins (a merchant user cannot wipe the kitchen)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      KitchenOrderDevController.prototype.resetTestData,
    ) as UserRole[];
    expect(roles).toEqual([UserRole.MERCHANT_ADMIN]);
  });

  describe('registration', () => {
    const controllersWith = (nodeEnv: string | undefined): unknown[] => {
      const previous = process.env.NODE_ENV;
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;
      let controllers: unknown[] = [];
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { KitchenOrderModule } = require('./kitchen-order.module') as {
          KitchenOrderModule: object;
        };
        controllers = Reflect.getMetadata(
          MODULE_METADATA.CONTROLLERS,
          KitchenOrderModule,
        ) as unknown[];
      });
      process.env.NODE_ENV = previous;
      return controllers;
    };
    const names = (controllers: unknown[]) =>
      controllers.map((c) => (c as { name: string }).name);

    it('is not registered in production: the route does not exist (404)', () => {
      expect(names(controllersWith('production'))).not.toContain(
        'KitchenOrderDevController',
      );
    });

    it('is not registered when NODE_ENV is unset or unknown', () => {
      for (const nodeEnv of [undefined, 'prod']) {
        expect(names(controllersWith(nodeEnv))).not.toContain(
          'KitchenOrderDevController',
        );
      }
    });

    it('is registered in development and test', () => {
      for (const nodeEnv of ['development', 'test']) {
        expect(names(controllersWith(nodeEnv))).toContain(
          'KitchenOrderDevController',
        );
      }
    });
  });
});
