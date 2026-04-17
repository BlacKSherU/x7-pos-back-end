import { Test, TestingModule } from '@nestjs/testing';
import { OrderTaxesController } from './order-taxes.controller';
import { OrderTaxesService } from './order-taxes.service';

describe('OrderTaxesController', () => {
  let controller: OrderTaxesController;

  const mockOrderTaxesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderTaxesController],
      providers: [
        { provide: OrderTaxesService, useValue: mockOrderTaxesService },
      ],
    }).compile();

    controller = module.get<OrderTaxesController>(OrderTaxesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
