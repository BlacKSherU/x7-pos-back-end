/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: Repository<Customer>;
  let merchantRepository: Repository<Merchant>;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;

  const mockCustomerRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
  };

  const mockMerchantRepository = {
    findOneBy: jest.fn(),
  };

  const mockUserRepository = {
    findOneBy: jest.fn(),
  };

  const mockCompanyRepository = {
    findOneBy: jest.fn(),
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

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
    companyId: 1,
  };

  const mockUserEntity = {
    id: 1,
    email: 'test@example.com',
    merchant: mockMerchant,
  };

  const mockCompany = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepository,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: mockCompanyRepository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get<Repository<Customer>>(
      getRepositoryToken(Customer),
    );
    merchantRepository = module.get<Repository<Merchant>>(
      getRepositoryToken(Merchant),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

    it('should create a customer successfully without company', async () => {
      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUserEntity as any);
      jest
        .spyOn(merchantRepository, 'findOneBy')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(customerRepository, 'create')
        .mockReturnValue(mockCustomer as any);
      jest
        .spyOn(customerRepository, 'save')
        .mockResolvedValue(mockCustomer as any);

      const result = await service.create(createCustomerDto, mockUser);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });
      expect(merchantRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.merchant.id,
      });
      expect(customerRepository.create).toHaveBeenCalledWith({
        ...createCustomerDto,
        merchant: mockMerchant,
      });
      expect(customerRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });

    it('should create a customer successfully with company', async () => {
      const dtoWithCompany = { ...createCustomerDto, companyId: 1 };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUserEntity as any);
      jest
        .spyOn(merchantRepository, 'findOneBy')
        .mockResolvedValue(mockMerchant as any);
      jest
        .spyOn(companyRepository, 'findOneBy')
        .mockResolvedValue(mockCompany as any);
      jest
        .spyOn(customerRepository, 'create')
        .mockReturnValue(mockCustomer as any);
      jest
        .spyOn(customerRepository, 'save')
        .mockResolvedValue(mockCustomer as any);

      const result = await service.create(dtoWithCompany, mockUser);

      expect(companyRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(customerRepository.create).toHaveBeenCalledWith({
        ...dtoWithCompany,
        merchant: mockMerchant,
        company: mockCompany,
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should throw error if user not found', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.create(createCustomerDto, mockUser)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw NotFoundException if merchant not found', async () => {
      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUserEntity as any);
      jest.spyOn(merchantRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.create(createCustomerDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createCustomerDto, mockUser)).rejects.toThrow(
        'Merchant not found',
      );
    });

    it('should throw NotFoundException if company not found', async () => {
      const dtoWithCompany = { ...createCustomerDto, companyId: 999 };

      jest
        .spyOn(userRepository, 'findOneBy')
        .mockResolvedValue(mockUserEntity as any);
      jest
        .spyOn(merchantRepository, 'findOneBy')
        .mockResolvedValue(mockMerchant as any);
      jest.spyOn(companyRepository, 'findOneBy').mockResolvedValue(null);

      await expect(service.create(dtoWithCompany, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(dtoWithCompany, mockUser)).rejects.toThrow(
        'Company not found',
      );
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

    it('should return all customers with formatted data', async () => {
      jest
        .spyOn(customerRepository, 'find')
        .mockResolvedValue(mockCustomers as any);

      const result = await service.findAll();

      expect(customerRepository.find).toHaveBeenCalledWith({
        relations: ['merchant', 'company'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: mockCustomers[0].id,
        name: mockCustomers[0].name,
        email: mockCustomers[0].email,
        phone: mockCustomers[0].phone,
        rut: mockCustomers[0].rut,
        address: mockCustomers[0].address,
        city: mockCustomers[0].city,
        state: mockCustomers[0].state,
        merchantId: mockCustomers[0].merchantId,
        merchant: {
          id: mockCustomers[0].merchant.id,
          name: mockCustomers[0].merchant.name,
        },
        companyId: mockCustomers[0].companyId,
        company: null,
      });
    });

    it('should handle customers without merchant or company relations', async () => {
      const customersWithoutRelations = [
        {
          ...mockCustomer,
          merchant: null,
          company: null,
        },
      ];

      jest
        .spyOn(customerRepository, 'find')
        .mockResolvedValue(customersWithoutRelations as any);

      const result = await service.findAll();

      expect(result[0].merchant).toBeNull();
      expect(result[0].company).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a customer successfully', async () => {
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);

      const result = await service.findOne(1, mockUser);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant', 'company'],
      });
      expect(result).toEqual({
        id: mockCustomer.id,
        name: mockCustomer.name,
        email: mockCustomer.email,
        phone: mockCustomer.phone,
        rut: mockCustomer.rut,
        address: mockCustomer.address,
        city: mockCustomer.city,
        state: mockCustomer.state,
        merchantId: mockCustomer.merchantId,
        merchant: {
          id: mockCustomer.merchant.id,
          name: mockCustomer.merchant.name,
        },
        companyId: mockCustomer.companyId,
        company: null,
      });
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant', async () => {
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 999,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(service.findOne(1, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle customer without merchant or company relations', async () => {
      const customerWithoutRelations = {
        ...mockCustomer,
        merchant: null,
        company: null,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerWithoutRelations as any);

      const result = await service.findOne(1, mockUser);

      expect(result.merchant).toBeNull();
      expect(result.company).toBeNull();
    });
  });

  describe('update', () => {
    const updateCustomerDto: UpdateCustomerDto = {
      name: 'John Updated',
      email: 'john.updated@example.com',
    };

    it('should update a customer successfully without companyId', async () => {
      const updatedCustomer = { ...mockCustomer, ...updateCustomerDto };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(customerRepository, 'save')
        .mockResolvedValue(updatedCustomer as any);

      const result = await service.update(1, updateCustomerDto, mockUser);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['merchant', 'company'],
      });
      expect(customerRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedCustomer);
    });

    it('should update a customer successfully with companyId', async () => {
      const dtoWithCompany = { ...updateCustomerDto, companyId: 1 };
      const updatedCustomer = {
        ...mockCustomer,
        ...dtoWithCompany,
        company: mockCompany,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(companyRepository, 'findOneBy')
        .mockResolvedValue(mockCompany as any);
      jest
        .spyOn(customerRepository, 'save')
        .mockResolvedValue(updatedCustomer as any);

      const result = await service.update(1, dtoWithCompany, mockUser);

      expect(companyRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(customerRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update(999, updateCustomerDto, mockUser),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(999, updateCustomerDto, mockUser),
      ).rejects.toThrow('Customer not found');
    });

    it('should throw ForbiddenException if customer belongs to different merchant', async () => {
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 999,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(
        service.update(1, updateCustomerDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if company not found when updating companyId', async () => {
      const dtoWithInvalidCompany = { ...updateCustomerDto, companyId: 999 };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest.spyOn(companyRepository, 'findOneBy').mockResolvedValue(null);

      await expect(
        service.update(1, dtoWithInvalidCompany, mockUser),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(1, dtoWithInvalidCompany, mockUser),
      ).rejects.toThrow('Company not found');
    });
  });

  describe('remove', () => {
    it('should remove a customer successfully', async () => {
      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(mockCustomer as any);
      jest
        .spyOn(customerRepository, 'remove')
        .mockResolvedValue(mockCustomer as any);

      const result = await service.remove(1, mockUser);

      expect(customerRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(customerRepository.remove).toHaveBeenCalledWith(mockCustomer);
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(999, mockUser)).rejects.toThrow(
        'Customer not found',
      );
    });

    it('should throw ForbiddenException if customer belongs to different merchant', async () => {
      const customerFromDifferentMerchant = {
        ...mockCustomer,
        merchantId: 999,
      };

      jest
        .spyOn(customerRepository, 'findOne')
        .mockResolvedValue(customerFromDifferentMerchant as any);

      await expect(service.remove(1, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
