/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { MovementsService } from './movements.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from './entities/movement.entity';
import { Item } from '../items/entities/item.entity';
import { Merchant } from '../../../../src/merchants/entities/merchant.entity';
import { OneMovementResponse } from './dto/movement-response.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { ErrorHandler } from '../../../../src/common/utils/error-handler.util';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementsStatus } from './constants/movements-status'; // Corrected import
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { Location } from 'src/products-inventory/stocks/locations/entities/location.entity';

describe('MovementsService', () => {
  let service: MovementsService;
  let movementRepo: jest.Mocked<Repository<Movement>>;

  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
    getOne: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  } as Merchant;

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    merchantId: mockMerchant.id,
  } as Product;

  const mockVariant = {
    id: 1,
    name: 'Test Variant',
    productId: mockProduct.id,
  } as Variant;

  const mockLocation = {
    id: 1,
    name: 'Test Location',
    address: 'Test Address',
    merchantId: mockMerchant.id,
  } as Location;

  const mockItem: Item = {
    id: 1,
    currentQty: 10,
    productId: mockProduct.id,
    product: mockProduct,
    variantId: mockVariant.id,
    variant: mockVariant,
    locationId: mockLocation.id,
    location: mockLocation,
    isActive: true,
    movements: [],
  };

  const mockMovement: Movement = {
    id: 1,
    stockItemId: mockItem.id,
    item: mockItem,
    quantity: 5,
    type: MovementsStatus.IN, // Corrected to MovementsStatus.IN
    reference: 'REF-001',
    reason: 'Initial stock',
    merchantId: mockMerchant.id,
    merchant: mockMerchant,
    isActive: true,
    createdAt: new Date(),
  };

  const mockCreateMovementDto: CreateMovementDto = {
    stockItemId: mockItem.id,
    quantity: 5,
    type: MovementsStatus.IN, // Corrected to MovementsStatus.IN
    reference: 'REF-001',
    reason: 'Initial stock',
  };

  const mockUpdateMovementDto: UpdateMovementDto = {
    quantity: 10,
    type: MovementsStatus.OUT, // Corrected to MovementsStatus.OUT
  };

  const mockQuery: GetMovementsQueryDto = {
    page: 1,
    limit: 10,
    itemName: undefined,
  };

  beforeEach(async () => {
    const mockMovementRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockItemRepo = {
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    };

    mockMovementRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockItemRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: getRepositoryToken(Movement), useValue: mockMovementRepo },
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
    movementRepo = module.get(getRepositoryToken(Movement));

    jest.clearAllMocks();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(ErrorHandler, 'notFound')
      .mockImplementation((message: string) => {
        throw new NotFoundException(message);
      });
    jest.spyOn(ErrorHandler, 'exists').mockImplementation((message: string) => {
      throw new BadRequestException(message);
    });
    jest
      .spyOn(ErrorHandler, 'invalidId')
      .mockImplementation((message: string) => {
        throw new BadRequestException(message);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Create', () => {
    it('should create a new Movement successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists
      movementRepo.create.mockReturnValueOnce(mockMovement);
      movementRepo.save.mockResolvedValueOnce(mockMovement);
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // For the findOne call inside create

      const result = await service.create(
        mockMerchant.id,
        mockCreateMovementDto,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'item.id = :stockItemId',
        { stockItemId: mockCreateMovementDto.stockItemId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'item.isActive = :isActive',
        { isActive: true },
      );
      expect(movementRepo.create).toHaveBeenCalledWith({
        item: mockItem,
        quantity: mockCreateMovementDto.quantity,
        type: mockCreateMovementDto.type,
        reference: mockCreateMovementDto.reference,
        reason: mockCreateMovementDto.reason,
        merchantId: mockMerchant.id,
        isActive: true,
      });
      expect(movementRepo.save).toHaveBeenCalledWith(mockMovement);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Movement Created successfully',
        data: {
          id: mockMovement.id,
          item: {
            id: mockMovement.item?.id,
            currentQty: mockMovement.item?.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      });
    });

    it('should throw NotFoundException if item is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Item not found

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateMovementDto),
      ).rejects.toThrow(NotFoundException);

      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the movement fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists
      movementRepo.create.mockReturnValueOnce(mockMovement);
      movementRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.create(mockMerchant.id, mockCreateMovementDto),
      ).rejects.toThrow('Database operation failed');

      expect(movementRepo.create).toHaveBeenCalled();
      expect(movementRepo.save).toHaveBeenCalled();
    });
  });

  describe('Create', () => {
    it('should throw BadRequestException for invalid quantity', async () => {
      const invalidCreateDto = { ...mockCreateMovementDto, quantity: 0 };
      await expect(async () =>
        service.create(mockMerchant.id, invalidCreateDto),
      ).rejects.toThrow('Movement quantity must be a positive number');
      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid stockItemId', async () => {
      const invalidCreateDto = { ...mockCreateMovementDto, stockItemId: 0 };
      await expect(async () =>
        service.create(mockMerchant.id, invalidCreateDto),
      ).rejects.toThrow('Item ID is incorrect');
      expect(movementRepo.create).not.toHaveBeenCalled();
      expect(movementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('FindAll', () => {
    it('should return all Movements successfully', async () => {
      const movements = [mockMovement];
      mockQueryBuilder.getMany.mockResolvedValue(movements);
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.item',
        'item',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'movement.createdAt',
        'DESC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Movements retrieved successfully',
        data: [
          {
            id: mockMovement.id,
            item: {
              id: mockMovement.item?.id,
              currentQty: mockMovement.item?.currentQty,
            },
            quantity: mockMovement.quantity,
            type: mockMovement.type,
            reference: mockMovement.reference,
            reason: mockMovement.reason,
            merchant: {
              id: mockMerchant.id,
              name: mockMerchant.name,
            },
            createdAt: mockMovement.createdAt,
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: movements.length,
        totalPages: Math.ceil(movements.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no movements found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Movements retrieved successfully');
      expect(result.total).toBe(0);
    });

    it('should return movements filtered by itemName', async () => {
      const queryWithName = {
        ...mockQuery,
        itemName: 'Test Product',
      };
      // For this test, ensure the mockItem returned by getMany has a product with a name
      const movements = [
        {
          ...mockMovement,
          item: {
            ...mockItem,
            product: { ...mockProduct, name: 'Test Product' },
          },
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(movements);
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(queryWithName, mockMerchant.id);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(item.name) LIKE LOWER(:itemName)',
        { itemName: '%Test Product%' },
      );
      expect(result.data).toEqual([
        {
          id: mockMovement.id,
          item: {
            id: mockItem.id,
            currentQty: mockItem.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      ]);
    });

    it('should handle pagination correctly', async () => {
      const paginatedQuery = { ...mockQuery, page: 2, limit: 5 };
      const movements = Array.from({ length: 10 }, (_, i) => ({
        ...mockMovement,
        id: i + 1,
      }));
      mockQueryBuilder.getMany.mockResolvedValue(movements.slice(5, 10));
      mockQueryBuilder.getCount.mockResolvedValue(movements.length);

      const result = await service.findAll(paginatedQuery, mockMerchant.id);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('FindOne', () => {
    it('should return a Movement successfully', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement exists

      const result = await service.findOne(mockMovement.id, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.item',
        'item',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'item.product',
        'product',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'movement.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: mockMovement.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Movement retrieved successfully',
        data: {
          id: mockMovement.id,
          item: {
            id: mockMovement.item?.id,
            currentQty: mockMovement.item?.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      });
    });

    it('should throw NotFoundException if Movement ID is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(async () =>
        service.findOne(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Movement not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: idNotFound,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
    });

    it('should throw BadRequestException if Movement ID is invalid', async () => {
      await expect(async () =>
        service.findOne(0, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.findOne(-1, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.findOne(null as any, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');
    });
  });

  describe('Update', () => {
    it('should update a Movement successfully', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        quantity: 10,
        type: MovementsStatus.OUT,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // 1. Find movement to update
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists if stockItemId is provided
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: {
            id: mockItem.id,
            currentQty: mockItem.currentQty,
          },
          quantity: updatedMovement.quantity,
          type: updatedMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse); // Mocking the internal call to findOne

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        mockUpdateMovementDto,
      );

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: mockMovement.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        quantity: 10,
        type: MovementsStatus.OUT,
      });
      expect(result).toEqual(expectedOneMovementResponse);
      expect(service.findOne).toHaveBeenCalledWith(
        updatedMovement.id,
        mockMerchant.id,
        'Updated',
      );
    });

    it('should update a Movement successfully with stockItemId', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        stockItemId: mockItem.id,
        item: mockItem,
      };

      const updateDtoWithItem: UpdateMovementDto = {
        stockItemId: mockItem.id,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // 1. Find movement to update
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item exists if stockItemId is provided
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: {
            id: mockItem.id,
            currentQty: mockItem.currentQty,
          },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse); // Mocking the internal call to findOne

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        updateDtoWithItem,
      );

      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        item: mockItem,
        stockItemId: mockItem.id,
      });
      expect(result).toEqual(expectedOneMovementResponse);
      expect(service.findOne).toHaveBeenCalledWith(
        updatedMovement.id,
        mockMerchant.id,
        'Updated',
      );
    });

    it('should update a Movement successfully with only quantity', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        quantity: 15,
      };
      const updateDto: UpdateMovementDto = {
        quantity: 15,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: { id: mockItem.id, currentQty: mockItem.currentQty },
          quantity: updatedMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse);

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        updateDto,
      );

      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        quantity: 15,
      });
      expect(result).toEqual(expectedOneMovementResponse);
    });

    it('should update a Movement successfully with only type', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        type: MovementsStatus.OUT,
      };
      const updateDto: UpdateMovementDto = {
        type: MovementsStatus.OUT,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: { id: mockItem.id, currentQty: mockItem.currentQty },
          quantity: mockMovement.quantity,
          type: updatedMovement.type,
          reference: mockMovement.reference,
          reason: mockMovement.reason,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse);

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        updateDto,
      );

      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        type: MovementsStatus.OUT,
      });
      expect(result).toEqual(expectedOneMovementResponse);
    });

    it('should update a Movement successfully with only reference', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        reference: 'NEW-REF-001',
      };
      const updateDto: UpdateMovementDto = {
        reference: 'NEW-REF-001',
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: { id: mockItem.id, currentQty: mockItem.currentQty },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: updatedMovement.reference,
          reason: mockMovement.reason,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse);

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        updateDto,
      );

      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        reference: 'NEW-REF-001',
      });
      expect(result).toEqual(expectedOneMovementResponse);
    });

    it('should update a Movement successfully with only reason', async () => {
      const updatedMovement: Movement = {
        ...mockMovement,
        reason: 'New reason for movement',
      };
      const updateDto: UpdateMovementDto = {
        reason: 'New reason for movement',
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      movementRepo.save.mockResolvedValueOnce(updatedMovement);
      const expectedOneMovementResponse: OneMovementResponse = {
        statusCode: 201,
        message: 'Movement Updated successfully',
        data: {
          id: updatedMovement.id,
          item: { id: mockItem.id, currentQty: mockItem.currentQty },
          quantity: mockMovement.quantity,
          type: mockMovement.type,
          reference: mockMovement.reference,
          reason: updatedMovement.reason,
          merchant: { id: mockMerchant.id, name: mockMerchant.name },
          createdAt: mockMovement.createdAt,
        },
      };
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(expectedOneMovementResponse);

      const result = await service.update(
        mockMovement.id,
        mockMerchant.id,
        updateDto,
      );

      expect(movementRepo.save).toHaveBeenCalledWith({
        ...mockMovement,
        reason: 'New reason for movement',
      });
      expect(result).toEqual(expectedOneMovementResponse);
    });

    it('should throw NotFoundException if Movement to update is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Movement not found

      await expect(async () =>
        service.update(idNotFound, mockMerchant.id, mockUpdateMovementDto),
      ).rejects.toThrow('Movement not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: idNotFound,
      });
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if stock item is not found during update', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Stock Item not found

      const updateDtoWithItem: UpdateMovementDto = {
        ...mockUpdateMovementDto,
        stockItemId: 999,
      };

      await expect(async () =>
        service.update(mockMovement.id, mockMerchant.id, updateDtoWithItem),
      ).rejects.toThrow('Item not found');

      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw an error if saving the updated movement fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockItem); // Item found
      movementRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.update(mockMovement.id, mockMerchant.id, mockUpdateMovementDto),
      ).rejects.toThrow('Database operation failed');

      expect(movementRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if Movement ID is invalid', async () => {
      await expect(async () =>
        service.update(0, mockMerchant.id, mockUpdateMovementDto),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.update(-1, mockMerchant.id, mockUpdateMovementDto),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.update(null as any, mockMerchant.id, mockUpdateMovementDto),
      ).rejects.toThrow('Movement ID is incorrect');
    });
  });

  describe('Remove', () => {
    it('should remove a Movement successfully', async () => {
      const movementToDelete: Movement = { ...mockMovement };
      const inactiveMovement: Movement = {
        ...movementToDelete,
        isActive: false,
      };

      mockQueryBuilder.getOne.mockResolvedValueOnce(movementToDelete); // Find movement to remove
      movementRepo.save.mockResolvedValueOnce(inactiveMovement);
      mockQueryBuilder.getOne.mockResolvedValueOnce(inactiveMovement); // For findOne call inside remove

      const result = await service.remove(mockMovement.id, mockMerchant.id);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: mockMovement.id,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'movement.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(movementToDelete.isActive).toBe(false);
      expect(movementRepo.save).toHaveBeenCalledWith(movementToDelete);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Movement Deleted successfully',
        data: {
          id: inactiveMovement.id,
          item: {
            id: inactiveMovement.item?.id,
            currentQty: inactiveMovement.item?.currentQty,
          },
          quantity: inactiveMovement.quantity,
          type: inactiveMovement.type,
          reference: inactiveMovement.reference,
          reason: inactiveMovement.reason,
          merchant: {
            id: mockMerchant.id,
            name: mockMerchant.name,
          },
          createdAt: inactiveMovement.createdAt,
        },
      });
    });

    it('should throw NotFoundException if Movement to remove is not found', async () => {
      const idNotFound = 999;
      mockQueryBuilder.getOne.mockResolvedValueOnce(null); // Movement not found

      await expect(async () =>
        service.remove(idNotFound, mockMerchant.id),
      ).rejects.toThrow('Movement not found');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('movement.id = :id', {
        id: idNotFound,
      });
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if Movement ID is invalid', async () => {
      await expect(async () =>
        service.remove(0, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.remove(-1, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');

      await expect(async () =>
        service.remove(null as any, mockMerchant.id),
      ).rejects.toThrow('Movement ID is incorrect');
    });

    it('should throw an error if saving the removed movement fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockMovement); // Movement found
      movementRepo.save.mockRejectedValueOnce(
        new Error('Database operation failed'),
      );

      await expect(async () =>
        service.remove(mockMovement.id, mockMerchant.id),
      ).rejects.toThrow('Database operation failed');

      expect(movementRepo.save).toHaveBeenCalled();
    });
  });
});
