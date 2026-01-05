/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OnlineDeliveryInfoService } from './online-delivery-info.service';
import { OnlineDeliveryInfo } from './entities/online-delivery-info.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { CreateOnlineDeliveryInfoDto } from './dto/create-online-delivery-info.dto';
import { UpdateOnlineDeliveryInfoDto } from './dto/update-online-delivery-info.dto';
import { GetOnlineDeliveryInfoQueryDto, OnlineDeliveryInfoSortBy } from './dto/get-online-delivery-info-query.dto';
import { OnlineStoreStatus } from '../online-stores/constants/online-store-status.enum';
import { OnlineOrderStatus } from '../online-order/constants/online-order-status.enum';
import { OnlineDeliveryInfoStatus } from './constants/online-delivery-info-status.enum';

describe('OnlineDeliveryInfoService', () => {
  let service: OnlineDeliveryInfoService;
  let onlineDeliveryInfoRepository: Repository<OnlineDeliveryInfo>;
  let onlineOrderRepository: Repository<OnlineOrder>;

  const mockOnlineDeliveryInfoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineOrderRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOnlineStore = {
    id: 1,
    merchant_id: 1,
    subdomain: 'my-store',
    is_active: true,
    theme: 'default',
    currency: 'USD',
    timezone: 'America/New_York',
    status: OnlineStoreStatus.ACTIVE,
    created_at: new Date('2023-10-01T12:00:00Z'),
    updated_at: new Date('2023-10-01T12:00:00Z'),
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
  };

  const mockOnlineOrder = {
    id: 1,
    merchant_id: 1,
    store_id: 1,
    order_id: null,
    customer_id: 1,
    status: OnlineOrderStatus.ACTIVE,
    type: 'delivery',
    payment_status: 'pending',
    scheduled_at: null,
    placed_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    total_amount: 125.99,
    notes: null,
    store: mockOnlineStore,
  };

  const mockOnlineDeliveryInfo = {
    id: 1,
    online_order_id: 1,
    customer_name: 'John Doe',
    address: '123 Main Street, Apt 4B',
    city: 'New York',
    phone: '+1-555-123-4567',
    delivery_instructions: 'Ring the doorbell twice',
    status: OnlineDeliveryInfoStatus.ACTIVE,
    created_at: new Date('2024-01-15T08:00:00Z'),
    updated_at: new Date('2024-01-15T09:00:00Z'),
    onlineOrder: mockOnlineOrder,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineDeliveryInfoService,
        {
          provide: getRepositoryToken(OnlineDeliveryInfo),
          useValue: mockOnlineDeliveryInfoRepository,
        },
        {
          provide: getRepositoryToken(OnlineOrder),
          useValue: mockOnlineOrderRepository,
        },
      ],
    }).compile();

    service = module.get<OnlineDeliveryInfoService>(OnlineDeliveryInfoService);
    onlineDeliveryInfoRepository = module.get<Repository<OnlineDeliveryInfo>>(
      getRepositoryToken(OnlineDeliveryInfo),
    );
    onlineOrderRepository = module.get<Repository<OnlineOrder>>(
      getRepositoryToken(OnlineOrder),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getOne.mockReset();
    mockQueryBuilder.getManyAndCount.mockReset();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createOnlineDeliveryInfoDto: CreateOnlineDeliveryInfoDto = {
      onlineOrderId: 1,
      customerName: 'John Doe',
      address: '123 Main Street, Apt 4B',
      city: 'New York',
      phone: '+1-555-123-4567',
      deliveryInstructions: 'Ring the doorbell twice',
    };

    it('should create an online delivery info successfully', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      const savedItem = { ...mockOnlineDeliveryInfo, id: 1 };
      jest.spyOn(onlineDeliveryInfoRepository, 'save').mockResolvedValue(savedItem as any);
      onlineDeliveryInfoRepository.findOne = jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOnlineDeliveryInfo as any);

      const result = await service.create(createOnlineDeliveryInfoDto, 1);

      expect(onlineOrderRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineDeliveryInfoRepository.save).toHaveBeenCalled();
      expect(onlineDeliveryInfoRepository.findOne).toHaveBeenCalledWith({
        where: { id: savedItem.id },
        relations: ['onlineOrder'],
      });
      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Online delivery info created successfully');
      expect(result.data.onlineOrderId).toBe(1);
      expect(result.data.customerName).toBe('John Doe');
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.create(createOnlineDeliveryInfoDto, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.create(createOnlineDeliveryInfoDto, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to create online delivery info',
      );
    });

    it('should throw NotFoundException if online order not found', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.create(createOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        'Online order not found or you do not have access to it',
      );
    });

    it('should throw BadRequestException if delivery info already exists', async () => {
      jest.spyOn(onlineOrderRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineOrder as any);
      jest.spyOn(onlineDeliveryInfoRepository, 'findOne').mockResolvedValue(mockOnlineDeliveryInfo as any);

      await expect(service.create(createOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        'This online order already has delivery info associated',
      );
    });
  });

  describe('findAll', () => {
    const query: GetOnlineDeliveryInfoQueryDto = {
      page: 1,
      limit: 10,
    };

    it('should return paginated list of online delivery info', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlineDeliveryInfo] as any, 1]);

      const result = await service.findAll(query, 1);

      expect(onlineDeliveryInfoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta.page).toBe(1);
      expect(result.paginationMeta.limit).toBe(10);
      expect(result.paginationMeta.total).toBe(1);
    });

    it('should throw ForbiddenException when user has no merchant_id', async () => {
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findAll(query, undefined as any)).rejects.toThrow(
        'You must be associated with a merchant to access online delivery info',
      );
    });

    it('should apply filters correctly', async () => {
      const queryWithFilters: GetOnlineDeliveryInfoQueryDto = {
        ...query,
        onlineOrderId: 1,
        customerName: 'John',
        city: 'New York',
      };
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockOnlineDeliveryInfo] as any, 1]);

      await service.findAll(queryWithFilters, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineDeliveryInfo.online_order_id = :onlineOrderId', { onlineOrderId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineDeliveryInfo.customer_name ILIKE :customerName', { customerName: '%John%' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('onlineDeliveryInfo.city = :city', { city: 'New York' });
    });
  });

  describe('findOne', () => {
    it('should return an online delivery info successfully', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineDeliveryInfo as any);

      const result = await service.findOne(1, 1);

      expect(onlineDeliveryInfoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.findOne(0, 1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findOne(0, 1)).rejects.toThrow(
        'Online delivery info ID must be a valid positive number',
      );
    });

    it('should throw NotFoundException if online delivery info not found', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Online delivery info not found',
      );
    });
  });

  describe('update', () => {
    const updateOnlineDeliveryInfoDto: UpdateOnlineDeliveryInfoDto = {
      address: '456 Oak Avenue, Suite 2',
      phone: '+1-555-987-6543',
    };

    it('should update an online delivery info successfully', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne
        .mockResolvedValueOnce(mockOnlineDeliveryInfo as any);
      jest.spyOn(onlineDeliveryInfoRepository, 'save').mockResolvedValue(mockOnlineDeliveryInfo as any);
      jest.spyOn(onlineDeliveryInfoRepository, 'findOne')
        .mockResolvedValueOnce({ ...mockOnlineDeliveryInfo, address: '456 Oak Avenue, Suite 2', phone: '+1-555-987-6543' } as any);

      const result = await service.update(1, updateOnlineDeliveryInfoDto, 1);

      expect(onlineDeliveryInfoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineDeliveryInfoRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info updated successfully');
    });

    it('should throw NotFoundException if online delivery info not found', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.update(1, updateOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online delivery info is already deleted', async () => {
      const deletedItem = { ...mockOnlineDeliveryInfo, status: OnlineDeliveryInfoStatus.DELETED };
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.update(1, updateOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(1, updateOnlineDeliveryInfoDto, 1)).rejects.toThrow(
        'Cannot update a deleted online delivery info',
      );
    });
  });

  describe('remove', () => {
    it('should remove an online delivery info successfully', async () => {
      const deletedItem = { ...mockOnlineDeliveryInfo, status: OnlineDeliveryInfoStatus.DELETED };
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(mockOnlineDeliveryInfo as any);
      jest.spyOn(onlineDeliveryInfoRepository, 'save').mockResolvedValue(deletedItem as any);

      const result = await service.remove(1, 1);

      expect(onlineDeliveryInfoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(onlineDeliveryInfoRepository.save).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Online delivery info deleted successfully');
    });

    it('should throw NotFoundException if online delivery info not found', async () => {
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.remove(1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if online delivery info is already deleted', async () => {
      const deletedItem = { ...mockOnlineDeliveryInfo, status: OnlineDeliveryInfoStatus.DELETED };
      jest.spyOn(onlineDeliveryInfoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      mockQueryBuilder.getOne.mockResolvedValue(deletedItem as any);

      await expect(service.remove(1, 1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.remove(1, 1)).rejects.toThrow(
        'Online delivery info is already deleted',
      );
    });
  });
});
