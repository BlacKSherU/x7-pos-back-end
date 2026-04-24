// src/customers/customers.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CreateCustomerDto } from './dtos/create-customer.dto';
import { UpdateCustomerDto } from './dtos/update-customer.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCustomerDto, user: AuthenticatedUser) {
    const userData = await this.userRepo.findOneBy({ id: user.id });
    if (!userData) throw new Error('User not found');

    const merchant = await this.merchantRepo.findOneBy({
      id: user.merchant.id,
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    let company: Company | null = null;
    if (dto.companyId) {
      company = await this.companyRepo.findOneBy({ id: dto.companyId });
      if (!company) throw new NotFoundException('Company not found');
    }

    const customerData: Partial<Customer> = {
      ...dto,
      merchant,
      ...(company ? { company } : {}),
    };
    const customer = this.customerRepo.create(customerData);
    return this.customerRepo.save(customer);
  }

  async findAll() {
    const customers = await this.customerRepo.find({
      relations: ['merchant', 'company'],
    });
    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      rut: customer.rut,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      merchantId: customer.merchantId,
      merchant: customer.merchant
        ? { id: customer.merchant.id, name: customer.merchant.name }
        : null,
      companyId: customer.companyId,
      company: customer.company
        ? { id: customer.company.id, name: customer.company.name }
        : null,
    }));
  }

  async findOne(id: number, user: AuthenticatedUser) {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['merchant', 'company'],
    });
    if (!customer) throw new NotFoundException();
    if (customer.merchantId !== user.merchant.id)
      throw new ForbiddenException();
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      rut: customer.rut,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      merchantId: customer.merchantId,
      merchant: customer.merchant
        ? { id: customer.merchant.id, name: customer.merchant.name }
        : null,
      companyId: customer.companyId,
      company: customer.company
        ? { id: customer.company.id, name: customer.company.name }
        : null,
    };
  }

  async update(id: number, dto: UpdateCustomerDto, user: AuthenticatedUser) {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['merchant', 'company'],
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.merchantId !== user.merchant.id)
      throw new ForbiddenException();

    // Validate companyId if present in the DTO
    if (dto.companyId) {
      const company = await this.companyRepo.findOneBy({ id: dto.companyId });
      if (!company) throw new NotFoundException('Company not found');
      customer.company = company;
    }

    Object.assign(customer, { ...dto, company: customer.company });
    return this.customerRepo.save(customer);
  }

  async remove(id: number, user: AuthenticatedUser) {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.merchantId !== user.merchant.id)
      throw new ForbiddenException();
    return this.customerRepo.remove(customer);
  }
}
