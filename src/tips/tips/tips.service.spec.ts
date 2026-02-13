import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipsService } from './tips.service';
import { Tip } from './entities/tip.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';
import { CreateTipDto } from './dto/create-tip.dto';
import { UpdateTipDto } from './dto/update-tip.dto';
import { TipRecordStatus } from './constants/tip-record-status.enum';
import { TipMethod } from './constants/tip-method.enum';
import { TipStatus } from './constants/tip-status.enum';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('TipsService', () => {
  let service: TipsService;

  const mockCompany = { id: 1, name: 'Acme Corp' };
  const mockMerchant = { id: 1, name: 'Main Store', companyId: 1, company: mockCompany };
  const mockOrder = { id: 1, merchant_id: 1 };

  const mockTip = {
    id: 1,
    company_id: 1,
    merchant_id: 1,
    order_id: 1,
    payment_id: null,
    amount: 5.50,
    method: TipMethod.CARD,
    status: TipStatus.PENDING,
    record_status: TipRecordStatus.ACTIVE,
    company: mockCompany,
    merchant: mockMerchant,
    order: mockOrder,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTipRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTip], 1]),
    })),
  };

  const mockCompanyRepository = { findOne: jest.fn() };
  const mockMerchantRepository = { findOne: jest.fn() };
  const mockOrderRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TipsService,
        { provide: getRepositoryToken(Tip), useValue: mockTipRepository },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepository },
        { provide: getRepositoryToken(Merchant), useValue: mockMerchantRepository },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
      ],
    }).compile();

    service = module.get<TipsService>(TipsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTipDto = {
      companyId: 1,
      merchantId: 1,
      orderId: 1,
      amount: 5.50,
      method: TipMethod.CARD,
      status: TipStatus.PENDING,
    };

    it('should create a tip successfully', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockTipRepository.save.mockResolvedValue(mockTip);
      mockTipRepository.findOne.mockResolvedValue(mockTip);

      const result = await service.create(createDto, 1);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Tip created successfully');
      expect(result.data.amount).toBe(5.50);
      expect(mockTipRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.create(createDto, null)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when merchantId does not match authenticated user', async () => {
      await expect(service.create({ ...createDto, merchantId: 2 }, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when company does not exist', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      mockCompanyRepository.findOne.mockResolvedValue(mockCompany);
      mockMerchantRepository.findOne.mockResolvedValue(mockMerchant);
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tips', async () => {
      const result = await service.findAll({ page: 1, limit: 10 }, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tips retrieved successfully');
      expect(result.data).toHaveLength(1);
      expect(result.paginationMeta).toBeDefined();
    });

    it('should throw ForbiddenException when user has no merchant', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return a tip by id', async () => {
      mockTipRepository.findOne.mockResolvedValue(mockTip);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip retrieved successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when tip does not exist', async () => {
      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTipDto = { status: TipStatus.SETTLED };

    it('should update a tip successfully', async () => {
      const updatedTip = { ...mockTip, status: TipStatus.SETTLED };
      mockTipRepository.findOne
        .mockResolvedValueOnce(mockTip)
        .mockResolvedValueOnce(updatedTip);
      mockTipRepository.update.mockResolvedValue(undefined);

      const result = await service.update(1, updateDto, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip updated successfully');
      expect(mockTipRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tip does not exist', async () => {
      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateDto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a tip successfully', async () => {
      const deletedTip = { ...mockTip, record_status: TipRecordStatus.DELETED };
      mockTipRepository.findOne.mockResolvedValue(mockTip);
      mockTipRepository.save.mockResolvedValue(deletedTip);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Tip deleted successfully');
      expect(result.data.recordStatus).toBe(TipRecordStatus.DELETED);
      expect(mockTipRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tip does not exist', async () => {
      mockTipRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
