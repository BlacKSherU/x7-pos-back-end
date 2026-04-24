import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemModifiersController } from './order-item-modifiers.controller';
import { OrderItemModifiersService } from './order-item-modifiers.service';

describe('OrderItemModifiersController', () => {
  let controller: OrderItemModifiersController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderItemModifiersController],
      providers: [
        { provide: OrderItemModifiersService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<OrderItemModifiersController>(
      OrderItemModifiersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
