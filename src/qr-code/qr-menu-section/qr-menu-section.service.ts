//src/qr-code/qr-menu-section/qr-menu-section.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QRMenu } from 'src/qr-code/qr-menu/entity/qr-menu.entity';
import { Repository, In } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { QRMenuSection } from './entity/qr-menu-section.entity';
import { CreateQRMenuSectionDto } from './dto/create-qr-menu-section.dto';
import { OneQRMenuSectionResponseDto } from './dto/qr-menu-section-response.dto';
import { QueryQRMenuSectionDto } from './dto/query-qr-menu-section.dto';
import { PaginatedQRMenuSectionResponseDto } from './dto/paginated-qr-menu-section-response.dto';
import { UpdateQRMenuSectionDto } from './dto/update-qr-menu-section.dto';

@Injectable()
export class QRMenuSectionService {
  constructor(
    @InjectRepository(QRMenuSection)
    private readonly qrMenuSectionRepository: Repository<QRMenuSection>,

    @InjectRepository(QRMenu)
    private readonly qrMenuRepository: Repository<QRMenu>,
  ) {}

  async create(
    dto: CreateQRMenuSectionDto,
  ): Promise<OneQRMenuSectionResponseDto> {
    if (dto.qrMenu && !Number.isInteger(dto.qrMenu)) {
      ErrorHandler.invalidId('QR MENU ID must be positive integer');
    }
    let qRMenu: QRMenu | null = null;

    if (dto.qrMenu) {
      if (dto.qrMenu) {
        qRMenu = await this.qrMenuRepository.findOne({
          where: { id: dto.qrMenu },
        });
        if (!qRMenu) {
          ErrorHandler.qrMenuNotFound();
        }
      }
    }
    const qrMenuSection = this.qrMenuSectionRepository.create({
      qrMenu: qRMenu,
      name: dto.name,
      description: dto.description,
      display_order: dto.display_order,
      status: dto.status,
    } as Partial<QRMenuSection>);

    const savedQRMenuSection =
      await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 201,
      message: 'QR Menu Section created successfully',
      data: savedQRMenuSection,
    };
  }
  async findAll(
    query: QueryQRMenuSectionDto,
  ): Promise<PaginatedQRMenuSectionResponseDto> {
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

    const qb = this.qrMenuSectionRepository
      .createQueryBuilder('qrMenuSection')
      .leftJoin('qrMenuSection.qrMenu', 'qrMenu')
      .select(['qrMenuSection', 'qrMenu.id', 'qrMenu.name']);

    if (status) {
      qb.andWhere('qrMenuSection.status = :status', { status });
    } else {
      qb.andWhere('qrMenuSection.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrMenuSection.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrMenuSection.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Menu Section retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }
    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['qrMenu'],
      select: {
        qrMenu: {
          id: true,
          name: true,
        },
      },
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Menu Section retrieved successfully',
      data: qrMenuSection,
    };
  }

  async update(
    id: number,
    dto: UpdateQRMenuSectionDto,
  ): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }
    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: { id },
      relations: ['qrMenu'],
      select: {
        qrMenu: {
          id: true,
          name: true,
        },
      },
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }

    Object.assign(qrMenuSection, dto);

    const updatedQrMenuSection =
      await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 200,
      message: 'QR Menu Section updated successfully',
      data: updatedQrMenuSection,
    };
  }

  async remove(id: number): Promise<OneQRMenuSectionResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Section ID must be a positive integer');
    }

    const qrMenuSection = await this.qrMenuSectionRepository.findOne({
      where: { id },
    });
    if (!qrMenuSection) {
      ErrorHandler.qrMenuSectionNotFound();
    }
    qrMenuSection.status = 'deleted';
    await this.qrMenuSectionRepository.save(qrMenuSection);
    return {
      statusCode: 200,
      message: 'QR Menu Section removed successfully',
      data: qrMenuSection,
    };
  }
}
