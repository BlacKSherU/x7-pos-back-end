//src/subscriptions/subscription-payments/subscription-payments.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { SubscriptionPaymentsService } from './subscription-payments.service';
import { CreateSubscriptionPaymentDto } from './dto/create-subscription-payments.dto';
import { UpdateSubscriptionPaymentDto } from './dto/update-subscription-payment.dto';
import { OneSubscriptionPaymentResponseDto } from './dto/subscription-payments-response.dto';
import { PaginatedSubscriptionPaymentResponseDto } from './dto/paginated-subscription-payment-response.dto';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';

describe('SubscriptionPaymentController', () => {
  let controller: SubscriptionPaymentsController;
  let service: jest.Mocked<SubscriptionPaymentsService>;

  // Mock data
  const mockMerchantSubscription: MerchantSubscription = {
    id: 1,
  } as MerchantSubscription;

  const mockSubscriptionPayment = {
    id: 1,
    merchantSubscription: mockMerchantSubscription,
    amount: 190000,
    currency: 'Pesos Chilenos',
    status: 'active',
    paymentDate: new Date(),
    paymentMethod: 'credit card',
  };

  const mockPagination = {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockPaginatedResponse: PaginatedSubscriptionPaymentResponseDto = {
    statusCode: 200,
    message: 'Subscription Payments retrieved successfully',
    data: [mockSubscriptionPayment],
    pagination: mockPagination,
  };

  const mockCreateSubscriptionPaymentDto: CreateSubscriptionPaymentDto = {
    merchantSubscriptionId: 2,
    amount: 250000,
    currency: 'Euros',
    status: 'active',
    paymentDate: new Date(),
    paymentMethod: 'Revolut',
  };

  const mockUpdateSubscriptionPaymentDto: UpdateSubscriptionPaymentDto = {
    merchantSubscriptionId: 2,
    amount: 300000,
    currency: 'Pesos Chilenos',
    status: 'active',
    paymentDate: new Date(),
    paymentMethod: 'Banco Santander',
  };

  const mockOneSubscriptionPaymentResponse: OneSubscriptionPaymentResponseDto =
    {
      statusCode: 200,
      message: 'Subscription Payment retrieved successfully',
      data: mockSubscriptionPayment,
    };

  beforeEach(async () => {
    const mockSubscriptionPaymentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionPaymentsController],
      providers: [
        {
          provide: SubscriptionPaymentsService,
          useValue: mockSubscriptionPaymentService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionPaymentsController>(
      SubscriptionPaymentsController,
    );
    service = module.get(SubscriptionPaymentsService);
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have subscriptionPaymentService defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // POST /subscription-payments
  // ----------------------------------------------------------
  describe('POST /subscription-payments', () => {
    it('should create a subscription payment  successfully', async () => {
      const createResponse: OneSubscriptionPaymentResponseDto = {
        statusCode: 201,
        message: 'Subscription Payment created successfully',
        data: mockSubscriptionPayment,
      };

      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockResolvedValue(createResponse);

      const result = await controller.create(mockCreateSubscriptionPaymentDto);

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPaymentDto);
      expect(result).toEqual(createResponse);
    });

    it('should handle errors during creation', async () => {
      const errorMessage = 'Failed to create Subscription Payment';
      const createSpy = jest.spyOn(service, 'create');
      createSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.create(mockCreateSubscriptionPaymentDto),
      ).rejects.toThrow(errorMessage);

      expect(createSpy).toHaveBeenCalledWith(mockCreateSubscriptionPaymentDto);
    });
  });

  // ----------------------------------------------------------
  // GET /subscription-applications
  // ----------------------------------------------------------
  describe('GET /subscription-payments', () => {
    it('should retrieve all subscription payments successfully', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should return empty list with pagination', async () => {
      const emptyPaginatedResponse: PaginatedSubscriptionPaymentResponseDto = {
        statusCode: 200,
        message: 'Subscription Payments retrieved successfully',
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockResolvedValue(emptyPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(result).toEqual(emptyPaginatedResponse);
      expect(result.data).toHaveLength(0);
    });

    it('should handle service errors in findAll', async () => {
      const errorMessage = 'Database error during retrieval';
      const findAllSpy = jest.spyOn(service, 'findAll');
      findAllSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        errorMessage,
      );

      expect(findAllSpy).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  // ----------------------------------------------------------
  // GET /subscription-payments/:id
  // ----------------------------------------------------------
  describe('GET /subscription-payments/:id', () => {
    it('should retrieve a subscription payment by ID successfully', async () => {
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockResolvedValue(mockOneSubscriptionPaymentResponse);

      const result = await controller.findOne(1);

      expect(findOneSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockOneSubscriptionPaymentResponse);
    });

    it('should handle errors when retrieving by ID', async () => {
      const errorMessage = 'Subscription Payment not found';
      const findOneSpy = jest.spyOn(service, 'findOne');
      findOneSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(999)).rejects.toThrow(errorMessage);

      expect(findOneSpy).toHaveBeenCalledWith(999);
    });
  });

  // ----------------------------------------------------------
  // PATCH /subscription-payments/:id
  // ----------------------------------------------------------
  describe('PATCH /subscription-payments/:id', () => {
    it('should update a subscription payment successfully', async () => {
      const updateResponse: OneSubscriptionPaymentResponseDto = {
        statusCode: 200,
        message: 'Subscription Payment updated successfully',
        data: mockSubscriptionPayment,
      };

      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockResolvedValue(updateResponse);

      const result = await controller.update(
        1,
        mockUpdateSubscriptionPaymentDto,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        1,
        mockUpdateSubscriptionPaymentDto,
      );
      expect(result).toEqual(updateResponse);
    });

    it('should handle errors during update', async () => {
      const errorMessage = 'Failed to update Subscription Payment';
      const updateSpy = jest.spyOn(service, 'update');
      updateSpy.mockRejectedValue(new Error(errorMessage));

      await expect(
        controller.update(999, mockUpdateSubscriptionPaymentDto),
      ).rejects.toThrow(errorMessage);

      expect(updateSpy).toHaveBeenCalledWith(
        999,
        mockUpdateSubscriptionPaymentDto,
      );
    });
  });

  // ----------------------------------------------------------
  // DELETE /subscription-payments/:id
  // ----------------------------------------------------------
  describe('DELETE /subscription-payments/:id', () => {
    it('should delete a subscription payment successfully', async () => {
      const deleteResponse = {
        statusCode: 200,
        message: 'Plan Application deleted successfully',
        data: mockOneSubscriptionPaymentResponse.data,
      };
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockResolvedValue(deleteResponse);

      const result = await controller.remove(1);

      expect(removeSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(deleteResponse);
    });

    it('should handle errors during deletion', async () => {
      const errorMessage = 'Failed to delete Merchant Subscription';
      const removeSpy = jest.spyOn(service, 'remove');
      removeSpy.mockRejectedValue(new Error(errorMessage));

      await expect(controller.remove(999)).rejects.toThrow(errorMessage);

      expect(removeSpy).toHaveBeenCalledWith(999);
    });
  });
});
