// src/qr-code/qr-location/qr-location.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Repository, In } from 'typeorm';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRLocation } from './entity/qr-location.entity';
import { Table } from 'src/tables/entities/table.entity';
import { CreateQRLocationDto } from './dto/create-qr-location.dto';
import { OneQRLocationResponseDto } from './dto/qr-location-response.dto';
import { QueryQRLocationDto } from './dto/query-qr-location.dto';
import { PaginatedQRLocationResponseDto } from './dto/paginated-qr-location-response.dto';
import { UpdateQrLocationDto } from './dto/update-qr-location.dto';

@Injectable()
export class QRLocationService {
  constructor(
    @InjectRepository(QRLocation)
    private readonly qrLocationRepository: Repository<QRLocation>,

    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,

    @InjectRepository(QRMenu)
    private readonly qrMenuRepository: Repository<QRMenu>,

    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) {}

  async create(dto: CreateQRLocationDto): Promise<OneQRLocationResponseDto> {
    if (dto.merchant && !Number.isInteger(dto.merchant)) {
      ErrorHandler.invalidId('MERCHANT ID must be positive integer');
    }
    if (dto.qrMenu && !Number.isInteger(dto.qrMenu)) {
      ErrorHandler.invalidId('QR MENU ID must be positive integer');
    }
    if (dto.table && !Number.isInteger(dto.table)) {
      ErrorHandler.invalidId('TABLE ID must be positive integer');
    }
    let merchant: Merchant | null = null;
    let qrMenu: QRMenu | null = null;
    let table: Table | null = null;

    if (dto.merchant) {
      merchant = await this.merchantRepository.findOne({
        where: { id: dto.merchant },
      });
      if (!merchant) {
        ErrorHandler.differentMerchant();
      }
    }

    if (dto.qrMenu) {
      qrMenu = await this.qrMenuRepository.findOne({
        where: { id: dto.qrMenu },
      });
      if (!qrMenu) {
        ErrorHandler.qrMenuNotFound();
      }
    }

    if (dto.table) {
      table = await this.tableRepository.findOne({
        where: { id: dto.table },
      });
      if (!table) {
        ErrorHandler.tableNotFound();
      }
    }

    const qrLocation = this.qrLocationRepository.create({
      qrMenu: qrMenu,
      merchant: merchant,
      table: table,
      name: dto.name,
      location_type: dto.location_type,
      status: dto.status,
      qr_code_url: dto.qr_code_url,
      qr_code_image: dto.qr_code_image,
    } as Partial<QRLocation>);

    const savedQRLocation = await this.qrLocationRepository.save(qrLocation);

    return {
      statusCode: 201,
      message: 'QR Location created successfully',
      data: savedQRLocation,
    };
  }
  async findAll(
    query: QueryQRLocationDto,
  ): Promise<PaginatedQRLocationResponseDto> {
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

    const qb = this.qrLocationRepository
      .createQueryBuilder('qrLocation')
      .leftJoin('qrLocation.qrMenu', 'qrMenu')
      .leftJoin('qrLocation.merchant', 'merchant')
      .leftJoin('qrLocation.table', 'table')
      .select([
        'qrLocation',
        'qrMenu.id',
        'qrMenu.name',
        'merchant.id',
        'merchant.name',
        'table.id',
      ]);

    if (status) {
      qb.andWhere('qrLocation.status = :status', { status });
    } else {
      qb.andWhere('qrLocation.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrLocation.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrLocation.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Location retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneQRLocationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Location ID must be a positive integer');
    }
    const qrLocation = await this.qrLocationRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['qrMenu', 'merchant', 'table'],
      select: {
        qrMenu: {
          id: true,
          name: true,
        },
        merchant: {
          id: true,
          name: true,
        },
        table: {
          id: true,
        },
      },
    });
    if (!qrLocation) {
      ErrorHandler.qrLocationNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Location retrieved successfully',
      data: qrLocation,
    };
  }

  async update(
    id: number,
    dto: UpdateQrLocationDto,
  ): Promise<OneQRLocationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Location ID must be a positive integer');
    }
    const qrLocation = await this.qrLocationRepository.findOne({
      where: { id },
      relations: ['qrMenu', 'merchant', 'table'],
      select: {
        qrMenu: {
          id: true,
          name: true,
        },
        merchant: {
          id: true,
          name: true,
        },
        table: {
          id: true,
        },
      },
    });
    if (!qrLocation) {
      ErrorHandler.qrLocationNotFound();
    }

    Object.assign(qrLocation, dto);

    const updatedQrLocation = await this.qrLocationRepository.save(qrLocation);
    return {
      statusCode: 200,
      message: 'QR Location updated successfully',
      data: updatedQrLocation,
    };
  }

  async remove(id: number): Promise<OneQRLocationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Location ID must be a positive integer');
    }

    const qrLocation = await this.qrLocationRepository.findOne({
      where: { id },
    });
    if (!qrLocation) {
      ErrorHandler.qrLocationNotFound();
    }
    qrLocation.status = 'deleted';
    await this.qrLocationRepository.save(qrLocation);
    return {
      statusCode: 200,
      message: 'QR Location removed successfully',
      data: qrLocation,
    };
  }
}
