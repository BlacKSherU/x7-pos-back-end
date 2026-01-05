// src/subscriptions/features/features.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureEntity } from './entity/features.entity';
import { Repository, In } from 'typeorm';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { OneFeatureResponseDto } from './dto/feature-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { QueryFeatureDto } from './dto/query-feature.dto';
import { PaginatedFeatureResponseDto } from './dto/paginated-feature-response.dto';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectRepository(FeatureEntity)
    private readonly featureRepo: Repository<FeatureEntity>,
  ) {}
  async create(dto: CreateFeatureDto): Promise<OneFeatureResponseDto> {
    const existing = await this.featureRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Feature with name "${dto.name}" already exists`,
      );
    }
    const feature = this.featureRepo.create(dto);
    const createdFeature = await this.featureRepo.save(feature);
    return {
      statusCode: 201,
      message: 'Feature created successfully',
      data: createdFeature,
    };
  }
  async findAll(query: QueryFeatureDto): Promise<PaginatedFeatureResponseDto> {
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

    const qb = this.featureRepo.createQueryBuilder('feature');

    if (status) {
      qb.andWhere('feature.status = :status', { status });
    } else {
      qb.andWhere('feature.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.orderBy(`feature.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'Features retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneFeatureResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Feature ID must be a positive number');
    }

    const feature = await this.featureRepo.findOne({
      where: { id, status: In(['active', 'inactive']) },
    });

    if (!feature) {
      ErrorHandler.featureNotFound();
    }

    return {
      statusCode: 200,
      message: 'Feature retrieved successfully',
      data: feature,
    };
  }
  async update(
    id: number,
    dto: UpdateFeatureDto,
  ): Promise<OneFeatureResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Feature ID must be a positive number');
    }

    const feature = await this.featureRepo.findOne({ where: { id } });

    if (!feature) {
      ErrorHandler.featureNotFound();
    }

    Object.assign(feature, dto);

    const updatedFeature = await this.featureRepo.save(feature);
    return {
      statusCode: 200,
      message: 'Feature updated successfully',
      data: updatedFeature,
    };
  }
  async remove(id: number): Promise<OneFeatureResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Feature ID must be a positive number');
    }

    const feature = await this.featureRepo.findOne({ where: { id } });

    if (!feature) {
      ErrorHandler.featureNotFound();
    }
    feature.status = 'deleted';
    await this.featureRepo.save(feature);
    return {
      statusCode: 200,
      message: 'Feature removed successfully',
      data: feature,
    };
  }
}
