import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table } from './entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import {
  TableResponseDto,
  OneTableResponseDto,
} from './dto/table-response.dto';
import { GetTablesQueryDto } from './dto/get-tables-query.dto';
import { PaginatedTablesResponseDto } from './dto/paginated-tables-response.dto';
import { FloorPlan } from '../floor-plan/entity/floor-plan.entity';
import { FloorZone } from '../floor-zone/entity/floor-zone.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
// import { IsUniqueField } from '../validators/is-unique-field.validator';
@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    @InjectRepository(FloorZone)
    private readonly floorZoneRepo: Repository<FloorZone>,

    @InjectRepository(FloorPlan)
    private readonly floorPlanRepo: Repository<FloorPlan>,
  ) {}

  async create(
    dto: CreateTableDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to create tables',
      );
    }

    // 2. Validate that the user can only create tables for their own merchant
    const dtoMerchantId = Number(dto.merchant_id);
    const userMerchantId = Number(authenticatedUserMerchantId);

    if (dtoMerchantId !== userMerchantId) {
      throw new ForbiddenException(
        'You can only create tables for your own merchant',
      );
    }

    // 3. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: dto.merchant_id },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${dto.merchant_id} not found`,
      );
    }

    const floorZone = await this.floorZoneRepo.findOne({
      where: { id: dto.floorZone },
      relations: ['floorPlan'],
    });

    if (!floorZone) {
      throw new NotFoundException('FloorZone not found');
    }

    const floorPlan = await this.floorPlanRepo.findOne({
      where: { id: dto.floorPlan },
      relations: ['merchant'],
    });

    if (!floorPlan) {
      throw new NotFoundException('FloorPlan not found');
    }

    if (floorZone.floorPlan.id !== floorPlan.id) {
      throw new BadRequestException(
        'FloorZone does not belong to the given FloorPlan',
      );
    }

    if (floorPlan.merchant.id !== merchant.id) {
      throw new BadRequestException(
        'FloorPlan does not belong to the Merchant',
      );
    }

    let parentTable: Table | null = null;

    if (dto.parent_table_id) {
      parentTable = await this.tableRepo.findOne({
        where: { id: dto.parent_table_id },
      });

      if (!parentTable) {
        throw new NotFoundException('Parent table not found');
      }
    }

    // 4. Validate uniqueness of table number within the merchant
    const existingTable = await this.tableRepo
      .createQueryBuilder('table')
      .where('table.number = :number', { number: dto.number })
      .andWhere('table.merchant = :merchantId', { merchantId: dto.merchant_id })
      .getOne();

    if (existingTable) {
      throw new ConflictException(
        `Table number '${dto.number}' already exists for merchant ${dto.merchant_id}`,
      );
    }

    // 5. Business rule validations
    if (dto.capacity <= 0) {
      throw new BadRequestException('Table capacity must be greater than 0');
    }

    // 6. Create the table
    const table = this.tableRepo.create({
      merchant: { id: dto.merchant_id } as Merchant,
      number: dto.number,
      capacity: dto.capacity,
      status: dto.status,
      location: dto.location,
      rotation: dto.rotation,
      shape: dto.shape,
      pos_x: dto.pos_x,
      pos_y: dto.pos_y,
      floorZone: { id: dto.floorZone } as FloorZone,
      floorPlan: { id: dto.floorPlan } as FloorPlan,
      parentTable: parentTable,
    } as Partial<Table>);

    const savedTable = await this.tableRepo.save(table);

    // 7. Return response with merchant information (without dates)
    return {
      statusCode: 201,
      message: 'Table created successfully',
      data: {
        id: savedTable.id,
        merchant_id: savedTable.merchant_id,
        number: savedTable.number,
        capacity: savedTable.capacity,
        status: savedTable.status,
        location: savedTable.location,
        rotation: savedTable.rotation,
        shape: savedTable.shape,
        pos_x: savedTable.pos_x,
        pos_y: savedTable.pos_y,
        merchant: {
          id: merchant.id,
          name: merchant.name,
        },
        floorZone: {
          id: floorZone.id,
          name: floorZone.name,
        },
        floorPlan: {
          id: floorPlan.id,
          name: floorPlan.name,
        },
        parent_table: savedTable.parentTable
          ? {
              id: savedTable.parentTable.id,
              number: savedTable.parentTable.number,
            }
          : null,
      },
    };
  }

  async findAll(
    query: GetTablesQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<PaginatedTablesResponseDto> {
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    // 2. Validate that the merchant exists
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 3. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 4. Build query with filters
    const queryBuilder = this.tableRepo
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.merchant', 'merchant')
      .leftJoinAndSelect('table.floorZone', 'floorZone')
      .leftJoinAndSelect('table.floorPlan', 'floorPlan')
      .leftJoinAndSelect('table.parentTable', 'parentTable')
      .where('merchant.id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });

    // 5. Apply optional filters
    if (query.status) {
      queryBuilder.andWhere('table.status = :status', { status: query.status });
    }

    if (query.minCapacity !== undefined) {
      queryBuilder.andWhere('table.capacity >= :minCapacity', {
        minCapacity: query.minCapacity,
      });
    }

    if (query.maxCapacity !== undefined) {
      queryBuilder.andWhere('table.capacity <= :maxCapacity', {
        maxCapacity: query.maxCapacity,
      });
    }

    // 6. Validate that minCapacity is not greater than maxCapacity
    if (query.minCapacity !== undefined && query.maxCapacity !== undefined) {
      if (query.minCapacity > query.maxCapacity) {
        throw new BadRequestException(
          'Minimum capacity cannot be greater than maximum capacity',
        );
      }
    }

    // 7. Get total records
    const total = await queryBuilder.getCount();

    // 8. Apply pagination and sorting
    const tables = await queryBuilder
      .orderBy('table.number', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 9. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 10. Map to TableResponseDto (without dates, with merchant info)
    const data: TableResponseDto[] = tables.map((table) => ({
      id: table.id,
      merchant_id: table.merchant_id,
      number: table.number,
      capacity: table.capacity,
      status: table.status,
      location: table.location,
      rotation: table.rotation,
      shape: table.shape,
      pos_x: table.pos_x,
      pos_y: table.pos_y,
      merchant: {
        id: table.merchant.id,
        name: table.merchant.name,
      },
      floorZone: table.floorZone,
      floorPlan: table.floorPlan,
      parent_table: table.parentTable
        ? {
            id: table.parentTable.id,
            number: table.parentTable.number,
          }
        : null,
    }));

    return {
      statusCode: 200,
      message: 'Tables retrieved successfully',
      data,
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    // 1. Validate that the authenticated user has merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to view tables',
      );
    }

    // 2. Validate that the ID is valid
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Search for the table
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['merchant', 'floorZone', 'floorPlan', 'parentTable'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    // 4. Validate that the user can only see tables from their own merchant
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only view tables from your own merchant',
      );
    }

    // 4. Validate that the merchant exists (we already know that table.merchant = authenticatedUserMerchantId)
    const merchant = await this.merchantRepo.findOne({
      where: { id: authenticatedUserMerchantId },
    });

    if (!merchant) {
      throw new NotFoundException(
        `Merchant with ID ${authenticatedUserMerchantId} not found`,
      );
    }

    // 7. Return response with merchant information (without dates)
    return {
      statusCode: 200,
      message: 'Table retrieved successfully',
      data: {
        id: table.id,
        merchant_id: table.merchant_id,
        number: table.number,
        capacity: table.capacity,
        status: table.status,
        location: table.location,
        rotation: table.rotation,
        shape: table.shape,
        pos_x: table.pos_x,
        pos_y: table.pos_y,
        merchant: {
          id: table.merchant.id,
          name: table.merchant.name,
        },
        floorZone: table.floorZone,
        floorPlan: table.floorPlan,
        parent_table: table.parentTable
          ? {
              id: table.parentTable.id,
              number: table.parentTable.number,
            }
          : null,
      },
    };
  }

  async update(
    id: number,
    dto: UpdateTableDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    // 0. Validate DTO
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('Update data is required');
    }

    // 0.1 Valid fields
    const validFields = [
      'number',
      'capacity',
      'status',
      'location',
      'rotation',
      'shape',
      'pos_x',
      'pos_y',
      'floorZone',
      'floorPlan',
      'parent_table_id',
    ];

    const hasValidField = validFields.some((field) => dto[field] !== undefined);

    if (!hasValidField) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // 1. Auth validation
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to update tables',
      );
    }

    // 2. ID validation
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Find table
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: ['merchant', 'parentTable'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    // 4. Ownership validation
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only update tables from your own merchant',
      );
    }

    // 5. Field validations
    if (dto.capacity !== undefined) {
      if (!Number.isInteger(dto.capacity) || dto.capacity <= 0) {
        throw new BadRequestException(
          'Table capacity must be a positive integer',
        );
      }
    }

    if (dto.number !== undefined) {
      if (typeof dto.number !== 'string' || dto.number.trim() === '') {
        throw new BadRequestException(
          'Table number must be a non-empty string',
        );
      }
    }

    if (dto.status !== undefined) {
      if (typeof dto.status !== 'string' || dto.status.trim() === '') {
        throw new BadRequestException('Status must be a non-empty string');
      }
    }

    if (dto.location !== undefined) {
      if (typeof dto.location !== 'string' || dto.location.trim() === '') {
        throw new BadRequestException('Location must be a non-empty string');
      }
    }

    // 6. Unique number validation
    if (dto.number !== undefined && dto.number !== table.number) {
      const existingTable = await this.tableRepo
        .createQueryBuilder('table')
        .leftJoin('table.merchant', 'merchant')
        .where('table.number = :number', { number: dto.number })
        .andWhere('merchant.id = :merchantId', {
          merchantId: table.merchant.id,
        })
        .getOne();

      if (existingTable && existingTable.id !== id) {
        throw new ConflictException(
          `Table number '${dto.number}' already exists`,
        );
      }
    }

    // 7. Relaciones: FloorZone
    if (dto.floorZone !== undefined) {
      const floorZone = await this.floorZoneRepo.findOne({
        where: { id: dto.floorZone },
        relations: ['floorPlan'],
      });

      if (!floorZone) {
        throw new NotFoundException('FloorZone not found');
      }

      table.floorZone = floorZone;
    }

    // 8. Relaciones: FloorPlan
    if (dto.floorPlan !== undefined) {
      const floorPlan = await this.floorPlanRepo.findOne({
        where: { id: dto.floorPlan },
        relations: ['merchant'],
      });

      if (!floorPlan) {
        throw new NotFoundException('FloorPlan not found');
      }

      table.floorPlan = floorPlan;
    }

    if (dto.parent_table_id !== undefined) {
      // evitar self-parent
      if (dto.parent_table_id === id) {
        throw new BadRequestException('A table cannot be its own parent');
      }

      if (dto.parent_table_id === null) {
        table.parentTable = null;
      } else {
        const parent = await this.tableRepo.findOne({
          where: { id: dto.parent_table_id },
        });

        if (!parent) {
          throw new NotFoundException('Parent table not found');
        }

        // evitar ciclo simple
        if (parent.parent_table_id === id) {
          throw new BadRequestException('Circular relationship detected');
        }

        table.parentTable = parent;
      }
    }

    // 10. Campos simples
    if (dto.number !== undefined) table.number = dto.number.trim();
    if (dto.capacity !== undefined) table.capacity = dto.capacity;
    if (dto.status !== undefined) table.status = dto.status.trim();
    if (dto.location !== undefined) table.location = dto.location.trim();
    if (dto.rotation !== undefined) table.rotation = dto.rotation;
    if (dto.shape !== undefined) table.shape = dto.shape;
    if (dto.pos_x !== undefined) table.pos_x = dto.pos_x;
    if (dto.pos_y !== undefined) table.pos_y = dto.pos_y;

    // 11. Save
    const updatedTable = await this.tableRepo.save(table);

    // 12. Recargar con relaciones
    const updated = await this.tableRepo.findOne({
      where: { id: updatedTable.id },
      relations: ['merchant', 'parentTable', 'floorZone', 'floorPlan'],
    });

    if (!updated) {
      throw new NotFoundException('Updated table not found');
    }

    // 13. Response
    return {
      statusCode: 200,
      message: 'Table updated successfully',
      data: {
        id: updated.id,
        merchant_id: updated.merchant_id,
        number: updated.number,
        capacity: updated.capacity,
        status: updated.status,
        location: updated.location,
        rotation: updated.rotation,
        shape: updated.shape,
        pos_x: updated.pos_x,
        pos_y: updated.pos_y,
        merchant: {
          id: updated.merchant.id,
          name: updated.merchant.name,
        },
        floorZone: updated.floorZone,
        floorPlan: updated.floorPlan,
        parent_table: updated.parentTable
          ? {
              id: updated.parentTable.id,
              number: updated.parentTable.number,
            }
          : null,
      },
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number,
  ): Promise<OneTableResponseDto> {
    // 1. Auth validation
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'User must be associated with a merchant to delete tables',
      );
    }

    // 2. ID validation
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid table ID');
    }

    // 3. Find table con relaciones
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: [
        'merchant',
        'parentTable',
        'childTables',
        'floorZone',
        'floorPlan',
      ],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    // 4. Ownership validation
    if (table.merchant.id !== authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You can only delete tables from your own merchant',
      );
    }

    // 5. Already deleted
    if (table.status === 'deleted') {
      throw new ConflictException('Table is already deleted');
    }

    // 6. 🔥 Manejar relaciones hijas
    if (table.childTables && table.childTables.length > 0) {
      for (const child of table.childTables) {
        child.parentTable = null;
        await this.tableRepo.save(child);
      }
    }

    // 7. (Opcional pro) validar órdenes activas
    // if (table.orders?.length > 0) {
    //   throw new ConflictException('Cannot delete table with active orders');
    // }

    // 8. Soft delete
    table.status = 'deleted';
    const updatedTable = await this.tableRepo.save(table);

    // 9. Recargar con relaciones
    const updated = await this.tableRepo.findOne({
      where: { id: updatedTable.id },
      relations: ['merchant', 'parentTable', 'floorZone', 'floorPlan'],
    });

    if (!updated) {
      throw new NotFoundException('Updated table not found');
    }

    // 10. Response
    return {
      statusCode: 200,
      message: 'Table deleted successfully',
      data: {
        id: updated.id,
        merchant_id: updated.merchant_id,
        number: updated.number,
        capacity: updated.capacity,
        status: updated.status,
        location: updated.location,
        rotation: updated.rotation,
        shape: updated.shape,
        pos_x: updated.pos_x,
        pos_y: updated.pos_y,
        merchant: {
          id: updated.merchant.id,
          name: updated.merchant.name,
        },
        floorZone: updated.floorZone,
        floorPlan: updated.floorPlan,
        parent_table: updated.parentTable
          ? {
              id: updated.parentTable.id,
              number: updated.parentTable.number,
            }
          : null,
      },
    };
  }
}
