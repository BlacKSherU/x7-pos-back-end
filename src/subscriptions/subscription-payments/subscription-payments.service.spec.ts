//src/subscriptions/subscription-payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionPayment } from './entity/subscription-payments.entity';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { Repository, In } from 'typeorm';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { SelectQueryBuilder } from 'typeorm';

describe('SubscriptionPaymentsService', () => {
  let service: SubscriptionPaymentsService;
  let repository: jest.Mocked<Repository<SubscriptionPayment>>;
  let merchantSubscriptionRepository: jest.Mocked<
    Repository<MerchantSubscription>
  >;

  //Mock data
  const mockSubscriptionPayment: Partial<SubscriptionPayment> = {
    id: 1,
    merchantSubscription: { id: 1 } as MerchantSubscription,
    amount: 190000,
    currency: 'Pesos Chilenos',
    status: 'active',
    paymentDate: new Date('2025-01-01'),
    paymentMethod: 'Banco de Chile',
  };

  const mockCreateSubscriptionPaymentDto: CreateSubscriptionPaymentDto = {
    merchantSubscriptionId: 1,
    amount: 20000,
    currency: 'Euros',
    status: 'active',
    paymentDate: new Date('2025-01-01'),
    paymentMethod: 'Revolut',
  };

  const mockUpdateSubscriptionPaymentDto: UpdateSubscriptionPaymentDto = {
    merchantSubscriptionId: 1,
    amount: 250000,
    currency: 'Pesos Chilenos',
    status: 'inactive',
    paymentDate: new Date('2025-12-01'),
    paymentMethod: 'Banco BCI',
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[mockSubscriptionPayment], 1]),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPaymentsService,
        {
          provide: getRepositoryToken(SubscriptionPayment),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(MerchantSubscription),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionPaymentsService>(
      SubscriptionPaymentsService,
    );
    repository = module.get(getRepositoryToken(SubscriptionPayment));
    merchantSubscriptionRepository = module.get(
      getRepositoryToken(MerchantSubscription),
    );

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(repository).toBeDefined();
    });
  });

  describe('Create Subscription Payment', () => {
    it('should create and return a subscription payment successfully', async () => {
      jest
        .spyOn(merchantSubscriptionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantSubscription);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockSubscriptionPayment as SubscriptionPayment);
      saveSpy.mockResolvedValue(mockSubscriptionPayment as SubscriptionPayment);

      const result = await service.create(mockCreateSubscriptionPaymentDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantSubscription: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionPayment);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Subscription Payment created successfully',
        data: mockSubscriptionPayment,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantSubscriptionRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantSubscription);

      const createSpy = jest.spyOn(repository, 'create');
      const saveSpy = jest.spyOn(repository, 'save');

      createSpy.mockReturnValue(mockSubscriptionPayment as SubscriptionPayment);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateSubscriptionPaymentDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantSubscription: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockSubscriptionPayment);
    });
  });

  describe('Find All Subscription Payment', () => {
    it('should return all subscription payments', async () => {
      const mockSubPay = [mockSubscriptionPayment as SubscriptionPayment];

      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<SubscriptionPayment>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockSubPay, mockSubPay.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Payment retrieved successfully',
        data: mockSubPay,
        pagination: {
          page: 1,
          limit: 10,
          total: mockSubPay.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no subscription payment found', async () => {
      const qb = repository.createQueryBuilder() as Partial<
        SelectQueryBuilder<SubscriptionPayment>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Payment retrieved successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('Find One Subscription Payment', () => {
    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should handle not found subscription payment', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Subscription Payment not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999, status: In(['active', 'inactive']) },
        relations: ['merchantSubscription'],
      });
    });

    it('should return a subscription payment when found', async () => {
      const mockFound = {
        id: 1,
        merchantSubscription: { id: 1 },
        amount: 190000,
        currency: 'Pesos Chilenos',
        status: 'active',
        paymentDate: new Date('2025-01-01'),
        paymentMethod: 'Banco de Chile',
      } as SubscriptionPayment;

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Payment retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Subscription Payment', () => {
    it('should update and return a subscription payment successfully', async () => {
      const updatedSubPay = {
        ...mockSubscriptionPayment,
        ...mockUpdateSubscriptionPaymentDto,
        merchantSubscriptionId: {
          id: mockUpdateSubscriptionPaymentDto.merchantSubscriptionId,
        } as MerchantSubscription,
      };
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionPayment as SubscriptionPayment,
      );
      saveSpy.mockResolvedValue(updatedSubPay as SubscriptionPayment);

      const result = await service.update(1, mockUpdateSubscriptionPaymentDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          merchantSubscription: { id: 1 },
          amount: 190000,
          currency: 'Pesos Chilenos',
          paymentDate: new Date('2025-01-01'),
          paymentMethod: 'Banco de Chile',
          status: 'inactive',
        }),
      );
      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Payment updated successfully',
        data: updatedSubPay,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateSubscriptionPaymentDto),
      ).rejects.toThrow();
    });

    it('should throw error when subscription payment to update not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateSubscriptionPaymentDto),
      ).rejects.toThrow('Subscription Payment not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionPayment as SubscriptionPayment,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateSubscriptionPaymentDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Subscription Payment', () => {
    it('should remove a subscription payment successfully', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      const saveSpy = jest.spyOn(repository, 'save');

      findOneSpy.mockResolvedValue(
        mockSubscriptionPayment as SubscriptionPayment,
      );
      saveSpy.mockResolvedValue(mockSubscriptionPayment as SubscriptionPayment);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Subscription Payment removed successfully',
        data: mockSubscriptionPayment,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when subscription payment to remove not found', async () => {
      const findOneSpy = jest.spyOn(repository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Subscription Payment not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the subscription payment repository', () => {
      expect(repository).toBeDefined();
      expect(typeof repository.find).toBe('function');
      expect(typeof repository.findOne).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.save).toBe('function');
      expect(typeof repository.remove).toBe('function');
    });
  });
});
