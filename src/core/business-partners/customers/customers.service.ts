// src/customers/customers.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
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
import { PaginationQueryDto } from 'src/common/dtos/pagination-query.dto';
import { requestedPage } from 'src/common/utils/pagination.util';

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
    // the token's user no longer exists: an authentication problem, not a server error
    if (!userData) throw new UnauthorizedException('User not found');

    const merchant = await this.merchantRepo.findOneBy({
      id: user.merchant.id,
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    let company: Company | null = null;
    if (dto.companyId) {
      company = await this.companyRepo.findOneBy({ id: dto.companyId });
      if (!company) throw new NotFoundException('Company not found');
    }

    const { rut, document_id, ...fields } = dto;
    const customerData: Partial<Customer> = {
      ...fields,
      document_id: document_id ?? rut ?? null,
      merchant,
      ...(company ? { company } : {}),
    };
    const customer = this.customerRepo.create(customerData);
    return this.customerRepo.save(customer);
  }

  /** Sin page ni limit, todos los clientes del comercio, como antes. */
  async findAll(merchantId: number, query: PaginationQueryDto & { companyId?: number } = {}) {
    const pagination = requestedPage(query);
    const where = query.companyId
      ? { companyId: query.companyId }
      : (merchantId ? { merchantId } : {});
    const [customers, total] = await this.customerRepo.findAndCount({
      where,
      relations: ['merchant', 'company', 'orders', 'loyaltyCustomers'],
      order: { id: 'ASC' },
      ...(pagination ? { skip: pagination.skip, take: pagination.limit } : {}),
    });
    const rows = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      document_id: customer.document_id,
      rut: customer.document_id,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      orders: customer.orders ?? [],
      loyaltyCustomers: customer.loyaltyCustomers ?? [],
      merchantId: customer.merchantId,
      merchant: customer.merchant
        ? { id: customer.merchant.id, name: customer.merchant.name }
        : null,
      companyId: customer.companyId,
      company: customer.company
        ? { id: customer.company.id, name: customer.company.name }
        : null,
    }));
    return { rows, total, paginated: pagination !== undefined };
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
      document_id: customer.document_id,
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

    const { rut, document_id, ...fields } = dto;
    Object.assign(customer, { ...fields, company: customer.company });
    // `rut` is the deprecated name of document_id; null clears it.
    if (document_id !== undefined || rut !== undefined) {
      customer.document_id =
        (document_id !== undefined ? document_id : rut) ?? null;
    }
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
