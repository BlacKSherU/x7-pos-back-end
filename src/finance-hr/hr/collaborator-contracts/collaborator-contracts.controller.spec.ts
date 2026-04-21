import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorContractsController } from './collaborator-contracts.controller';
import { CollaboratorContractsService } from './collaborator-contracts.service';

const mockCollaboratorContractsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CollaboratorContractsController', () => {
  let controller: CollaboratorContractsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaboratorContractsController],
      providers: [
        {
          provide: CollaboratorContractsService,
          useValue: mockCollaboratorContractsService,
        },
      ],
    }).compile();

    controller = module.get<CollaboratorContractsController>(
      CollaboratorContractsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
