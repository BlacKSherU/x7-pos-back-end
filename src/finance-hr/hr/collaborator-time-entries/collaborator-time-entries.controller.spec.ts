import { Test, TestingModule } from '@nestjs/testing';
import { CollaboratorTimeEntriesController } from './collaborator-time-entries.controller';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';

const mockCollaboratorTimeEntriesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CollaboratorTimeEntriesController', () => {
  let controller: CollaboratorTimeEntriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaboratorTimeEntriesController],
      providers: [
        {
          provide: CollaboratorTimeEntriesService,
          useValue: mockCollaboratorTimeEntriesService,
        },
      ],
    }).compile();

    controller = module.get<CollaboratorTimeEntriesController>(
      CollaboratorTimeEntriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
