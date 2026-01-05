//src/subscriptions/applications/applications.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { ApplicationEntity } from './entity/application-entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { OneApplicationResponseDto } from './dto/application-response.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QueryApplicationDto } from './dto/query-application.dto';
import { PaginatedApplicationResponseDto } from './dto/paginated-application-response.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
  ) {}
  async create(dto: CreateApplicationDto): Promise<OneApplicationResponseDto> {
    const existing = await this.applicationRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Application with name "${dto.name}" already exists`,
      );
    }
    const application = this.applicationRepo.create(dto);
    const createdApplication = await this.applicationRepo.save(application);
    return {
      statusCode: 201,
      message: 'Application created successfully',
      data: createdApplication,
    };
  }

  async findAll(
    query: QueryApplicationDto,
  ): Promise<PaginatedApplicationResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'DESC',
    } = query;

    if (page < 1 || limit < 1) {
      ErrorHandler.invalidInput('Page and limit must be positive integers');
    }

    const qb = this.applicationRepo.createQueryBuilder('application');

    if (status) {
      qb.andWhere('application.status = :status', { status });
    } else {
      qb.andWhere('application.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.orderBy(`application.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'Applications retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneApplicationResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
    });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }

    return {
      statusCode: 200,
      message: 'Application retrieved successfully',
      data: application,
    };
  }
  async update(
    id: number,
    dto: UpdateApplicationDto,
  ): Promise<OneApplicationResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({ where: { id } });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }

    Object.assign(application, dto);

    const updatedApplication = await this.applicationRepo.save(application);
    return {
      statusCode: 200,
      message: 'Application updated successfully',
      data: updatedApplication,
    };
  }
  async remove(id: number): Promise<OneApplicationResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Application ID must be a positive number');
    }

    const application = await this.applicationRepo.findOne({ where: { id } });

    if (!application) {
      ErrorHandler.applicationNotFound();
    }
    application.status = 'deleted';
    await this.applicationRepo.save(application);
    return {
      statusCode: 200,
      message: 'Application removed successfully',
      data: application,
    };
  }
}
