import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QRMenuItem } from './entity/qr-menu-item.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import { QRMenuSection } from '../qr-menu-section/entity/qr-menu-section.entity';
import { OneQRMenuItemResponseDto } from './dto/qr-menu-item-response.dto';
import { CreateQRMenuItemDto } from './dto/create-qr-menu-item.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { Repository, In } from 'typeorm';
import { QueryQRMenuItemDto } from './dto/query-qr-menu-item.dto';
import { PaginatedQRMenuItemResponseDto } from './dto/paginated-qr-menu-item-response.dto';
import { UpdateQRMenuItemDto } from './dto/update-qr-menu-item.dto';

@Injectable()
export class QRMenuItemService {
  constructor(
    @InjectRepository(QRMenuItem)
    private readonly qrMenuItemRepository: Repository<QRMenuItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(QRMenuSection)
    private readonly qrMenuSectionRepository: Repository<QRMenuSection>,

    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
  ) {}

  async create(dto: CreateQRMenuItemDto): Promise<OneQRMenuItemResponseDto> {
    if (dto.qrMenuSection && !Number.isInteger(dto.qrMenuSection)) {
      ErrorHandler.invalidId('QR MENU SECTION ID must be positive integer');
    }
    if (dto.product && !Number.isInteger(dto.product)) {
      ErrorHandler.invalidId('PRODUCT ID must be positive integer');
    }
    if (dto.variant && !Number.isInteger(dto.variant)) {
      ErrorHandler.invalidId('VARIANT ID must be positive integer');
    }
    let qrMenuSection: QRMenuSection | null = null;
    let product: Product | null = null;
    let variant: Variant | null = null;

    if (dto.qrMenuSection) {
      qrMenuSection = await this.qrMenuSectionRepository.findOne({
        where: { id: dto.qrMenuSection },
      });
      if (!qrMenuSection) {
        ErrorHandler.qrMenuItemNotFound();
      }
    }

    if (dto.product) {
      product = await this.productRepository.findOne({
        where: { id: dto.product },
      });
      if (!product) {
        ErrorHandler.productNotFound();
      }
    }

    if (dto.variant) {
      variant = await this.variantRepository.findOne({
        where: { id: dto.variant },
      });
      if (!variant) {
        ErrorHandler.variantNotFound();
      }
    }

    const qrMenuItem = this.qrMenuItemRepository.create({
      qrMenuSection: qrMenuSection,
      product: product,
      variant: variant,
      status: dto.status,
      display_order: dto.display_order,
      notes: dto.notes,
      is_visible: dto.is_visible,
    } as Partial<QRMenuItem>);

    const savedQRMenuItem = await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 201,
      message: 'QR Menu Item created successfully',
      data: savedQRMenuItem,
    };
  }
  async findAll(
    query: QueryQRMenuItemDto,
  ): Promise<PaginatedQRMenuItemResponseDto> {
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

    const qb = this.qrMenuItemRepository
      .createQueryBuilder('qrMenuItem')
      .leftJoin('qrMenuItem.qrMenuSection', 'qrMenuSection')
      .leftJoin('qrMenuItem.product', 'product')
      .leftJoin('qrMenuItem.variant', 'variant')
      .select([
        'qrMenuItem',
        'qrMenuSection.id',
        'qrMenuSection.name',
        'product.id',
        'product.name',
        'variant.id',
        'variant.name',
      ]);

    if (status) {
      qb.andWhere('qrMenuItem.status = :status', { status });
    } else {
      qb.andWhere('qrMenuItem.status IN (:...statuses)', {
        statuses: ['active', 'inactive'],
      });
    }

    qb.andWhere('qrMenuItem.status != :deleted', {
      deleted: 'deleted',
    });

    qb.orderBy(`qrMenuItem.${sortBy}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      statusCode: 200,
      message: 'QR Menu Item retrieved successfully',
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id, status: In(['active', 'inactive']) },
      relations: ['qrMenuSection', 'product', 'variant'],
      select: {
        qrMenuSection: {
          id: true,
          name: true,
        },
        product: {
          id: true,
          name: true,
        },
        variant: {
          id: true,
          name: true,
        },
      },
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }
    return {
      statusCode: 200,
      message: 'QR Menu Item retrieved successfully',
      data: qrMenuItem,
    };
  }
  async update(
    id: number,
    dto: UpdateQRMenuItemDto,
  ): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }
    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id },
      relations: ['qrMenuSection', 'product', 'variant'],
      select: {
        qrMenuSection: {
          id: true,
          name: true,
        },
        product: {
          id: true,
          name: true,
        },
        variant: {
          id: true,
          name: true,
        },
      },
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }

    Object.assign(qrMenuItem, dto);

    const updatedQrMenuItem = await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 200,
      message: 'QR Menu Item updated successfully',
      data: updatedQrMenuItem,
    };
  }

  async remove(id: number): Promise<OneQRMenuItemResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('QR Menu Item ID must be a positive integer');
    }

    const qrMenuItem = await this.qrMenuItemRepository.findOne({
      where: { id },
    });
    if (!qrMenuItem) {
      ErrorHandler.qrMenuItemNotFound();
    }
    qrMenuItem.status = 'deleted';
    await this.qrMenuItemRepository.save(qrMenuItem);
    return {
      statusCode: 200,
      message: 'QR Menu Item removed successfully',
      data: qrMenuItem,
    };
  }
}
