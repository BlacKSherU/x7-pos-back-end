import { Test, TestingModule } from '@nestjs/testing';
import { OrderPaymentsController } from './order-payments.controller';
import { OrderPaymentsService } from './order-payments.service';

describe('OrderPaymentsController', () => {
  let controller: OrderPaymentsController;

  const mockOrderPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderPaymentsController],
      providers: [
        { provide: OrderPaymentsService, useValue: mockOrderPaymentsService },
      ],
    }).compile();

    controller = module.get<OrderPaymentsController>(OrderPaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
