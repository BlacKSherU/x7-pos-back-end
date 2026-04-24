import { Test, TestingModule } from '@nestjs/testing';
import { SupplierCreditNotesController } from './supplier-credit-notes.controller';
import { SupplierCreditNotesService } from './supplier-credit-notes.service';

describe('SupplierCreditNotesController', () => {
  let controller: SupplierCreditNotesController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierCreditNotesController],
      providers: [
        { provide: SupplierCreditNotesService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<SupplierCreditNotesController>(
      SupplierCreditNotesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
