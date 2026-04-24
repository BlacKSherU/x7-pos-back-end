/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('CustomersController', () => {
  let controller: CustomersController;
  let service: CustomersService;

  const mockCustomersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser: AuthenticatedUser = {
    id: 1,
    email: 'test@example.com',
    role: 'merchant_admin' as any,
    scope: 'merchant' as any,
    merchant: {
      id: 1,
    },
  };

  const mockRequest = {
    user: mockUser,
  };

  const mockCustomer = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    rut: '12345678-9',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    merchantId: 1,
    companyId: null,
    merchant: {
      id: 1,
      name: 'Test Merchant',
    },
    company: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    controller = module.get<CustomersController>(CustomersController);
    service = module.get<CustomersService>(CustomersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createCustomerDto: CreateCustomerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      rut: '12345678-9',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
    };

    it('should create a customer successfully', async () => {
      jest.spyOn(service, 'create').mockResolvedValue(mockCustomer as any);

      const result = await controller.create(
        createCustomerDto,
        mockRequest as any,
      );

      expect(service.create).toHaveBeenCalledWith(createCustomerDto, mockUser);
      expect(result).toEqual(mockCustomer);
    });

    it('should create a customer with company successfully', async () => {
      const dtoWithCompany = { ...createCustomerDto, companyId: 1 };
      const customerWithCompany = {
        ...mockCustomer,
        companyId: 1,
        company: {
          id: 1,
          name: 'Test Company',
          email: 'test@company.com',
          phone: '1234567890',
          rut: '12345678-9',
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          merchants: [],
          customers: [],
          configurations: [],
          suppliers: [],
        },
      };

      jest
        .spyOn(service, 'create')
        .mockResolvedValue(customerWithCompany as any);

      const result = await controller.create(
        dtoWithCompany,
        mockRequest as any,
      );

      expect(service.create).toHaveBeenCalledWith(dtoWithCompany, mockUser);
      expect(result).toEqual(customerWithCompany);
    });

    it('should handle service errors during creation', async () => {
      const error = new Error('Creation failed');
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(
        controller.create(createCustomerDto, mockRequest as any),
      ).rejects.toThrow('Creation failed');
      expect(service.create).toHaveBeenCalledWith(createCustomerDto, mockUser);
    });
  });

  describe('findAll', () => {
    const mockCustomers = [
      {
        ...mockCustomer,
        id: 1,
      },
      {
        ...mockCustomer,
        id: 2,
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    ];

    it('should return all customers', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockCustomers as any);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockCustomers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no customers exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should handle service errors during findAll', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(service, 'findAll').mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow(
        'Database connection failed',
      );
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCustomer as any);

      const result = await controller.findOne(1, mockRequest as any);

      expect(service.findOne).toHaveBeenCalledWith(1, mockUser);
      expect(result).toEqual(mockCustomer);
    });

    it('should handle invalid id parameter', async () => {
      const error = new Error('Invalid ID');
      jest.spyOn(service, 'findOne').mockRejectedValue(error);

      await expect(controller.findOne(999, mockRequest as any)).rejects.toThrow(
        'Invalid ID',
      );
      expect(service.findOne).toHaveBeenCalledWith(999, mockUser);
    });

    it('should handle service errors during findOne', async () => {
      const error = new Error('Customer not found');
      jest.spyOn(service, 'findOne').mockRejectedValue(error);

      await expect(controller.findOne(1, mockRequest as any)).rejects.toThrow(
        'Customer not found',
      );
      expect(service.findOne).toHaveBeenCalledWith(1, mockUser);
    });
  });

  describe('update', () => {
    const updateCustomerDto: UpdateCustomerDto = {
      name: 'John Updated',
      email: 'john.updated@example.com',
    };

    it('should update a customer successfully', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateCustomerDto };

      jest.spyOn(service, 'update').mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(
        1,
        updateCustomerDto,
        mockRequest as any,
      );

      expect(service.update).toHaveBeenCalledWith(
        1,
        updateCustomerDto,
        mockUser,
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should update a customer with companyId', async () => {
      const dtoWithCompany = { ...updateCustomerDto, companyId: 2 };
      const updatedCustomer = {
        ...mockCustomer,
        ...dtoWithCompany,
        company: { id: 2, name: 'Updated Company' },
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedCustomer as any);

      const result = await controller.update(
        1,
        dtoWithCompany,
        mockRequest as any,
      );

      expect(service.update).toHaveBeenCalledWith(1, dtoWithCompany, mockUser);
      expect(result).toEqual(updatedCustomer);
    });

    it('should handle partial updates', async () => {
      const partialDto = { name: 'Only Name Updated' };
      const partiallyUpdated = { ...mockCustomer, name: 'Only Name Updated' };

      jest.spyOn(service, 'update').mockResolvedValue(partiallyUpdated as any);

      const result = await controller.update(1, partialDto, mockRequest as any);

      expect(service.update).toHaveBeenCalledWith(1, partialDto, mockUser);
      expect(result).toEqual(partiallyUpdated);
    });

    it('should handle service errors during update', async () => {
      const error = new Error('Update failed');
      jest.spyOn(service, 'update').mockRejectedValue(error);

      await expect(
        controller.update(1, updateCustomerDto, mockRequest as any),
      ).rejects.toThrow('Update failed');
      expect(service.update).toHaveBeenCalledWith(
        1,
        updateCustomerDto,
        mockUser,
      );
    });

    it('should handle invalid id during update', async () => {
      const error = new Error('Customer not found');
      jest.spyOn(service, 'update').mockRejectedValue(error);

      await expect(
        controller.update(999, updateCustomerDto, mockRequest as any),
      ).rejects.toThrow('Customer not found');
      expect(service.update).toHaveBeenCalledWith(
        999,
        updateCustomerDto,
        mockUser,
      );
    });
  });

  describe('remove', () => {
    it('should remove a customer successfully', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(mockCustomer as any);

      const result = await controller.remove(1, mockRequest as any);

      expect(service.remove).toHaveBeenCalledWith(1, mockUser);
      expect(result).toEqual(mockCustomer);
    });

    it('should handle service errors during removal', async () => {
      const error = new Error('Removal failed');
      jest.spyOn(service, 'remove').mockRejectedValue(error);

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(
        'Removal failed',
      );
      expect(service.remove).toHaveBeenCalledWith(1, mockUser);
    });

    it('should handle invalid id during removal', async () => {
      const error = new Error('Customer not found');
      jest.spyOn(service, 'remove').mockRejectedValue(error);

      await expect(controller.remove(999, mockRequest as any)).rejects.toThrow(
        'Customer not found',
      );
      expect(service.remove).toHaveBeenCalledWith(999, mockUser);
    });

    it('should handle permission errors during removal', async () => {
      const error = new Error('Forbidden');
      jest.spyOn(service, 'remove').mockRejectedValue(error);

      await expect(controller.remove(1, mockRequest as any)).rejects.toThrow(
        'Forbidden',
      );
      expect(service.remove).toHaveBeenCalledWith(1, mockUser);
    });
  });
});
