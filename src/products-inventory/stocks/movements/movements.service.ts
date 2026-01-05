import { Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movement } from './entities/movement.entity';
import {
  MovementResponseDto,
  OneMovementResponse,
} from './dto/movement-response.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { AllPaginatedMovements } from './dto/all-paginated-movements.dto';
import { ItemLittleResponseDto } from '../items/dto/item-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async create(
    merchant_id: number,
    createMovementDto: CreateMovementDto,
  ): Promise<OneMovementResponse> {
    const { stockItemId, quantity, type, reference, reason } =
      createMovementDto;
    const merchantId = merchant_id;

    if (!stockItemId || stockItemId <= 0) {
      ErrorHandler.invalidId(ErrorMessage.ITEM_ID_INCORRECT);
    }

    if (quantity <= 0) {
      ErrorHandler.invalidId(ErrorMessage.MOVEMENT_QUANTITY_INVALID);
    }

    const item = await this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.product', 'product')
      .where('item.id = :stockItemId', { stockItemId })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .getOne();

    if (!item) {
      ErrorHandler.notFound(ErrorMessage.ITEM_NOT_FOUND);
    }

    const newMovement = this.movementRepository.create({
      item,
      quantity,
      type,
      reference,
      reason,
      merchantId: merchant_id,
      isActive: true,
    });

    const savedMovement = await this.movementRepository.save(newMovement);

    return this.findOne(savedMovement.id, merchantId, 'Created');
  }

  async findAll(
    query: GetMovementsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedMovements> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where('product.merchantId = :merchantId', { merchantId })
      .andWhere('movement.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.itemName) {
      queryBuilder.andWhere('LOWER(item.name) LIKE LOWER(:itemName)', {
        itemName: `%${query.itemName}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const movements = await queryBuilder
      .orderBy('movement.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to MovementResponseDto
    const data: MovementResponseDto[] = await Promise.all(
      movements.map((movement) => {
        const result: MovementResponseDto = {
          id: movement.id,
          item: movement.item
            ? ({
                id: movement.item.id,
                currentQty: movement.item.currentQty,
              } as ItemLittleResponseDto)
            : null,
          quantity: movement.quantity,
          type: movement.type,
          reference: movement.reference,
          reason: movement.reason,
          merchant: movement.merchant
            ? {
                id: movement.merchant.id,
                name: movement.merchant.name,
              }
            : null,
          createdAt: movement.createdAt,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Movements retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };

    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const movementQueryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product') // Join product through item
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where('movement.id = :id', { id })
      .andWhere('movement.isActive = :isActive', {
        isActive: whereCondition.isActive,
      });

    if (merchantId !== undefined) {
      movementQueryBuilder.andWhere('product.merchantId = :merchantId', {
        merchantId,
      });
    }

    const movement = await movementQueryBuilder.getOne();

    if (!movement) {
      ErrorHandler.notFound(ErrorMessage.MOVEMENT_NOT_FOUND); // Need to add MOVEMENT_NOT_FOUND to error-messages.ts
    }

    const result: MovementResponseDto = {
      id: movement.id,
      item: movement.item
        ? ({
            id: movement.item.id,
            currentQty: movement.item.currentQty,
          } as ItemLittleResponseDto)
        : null,
      quantity: movement.quantity,
      type: movement.type,
      reference: movement.reference,
      reason: movement.reason,
      merchant: movement.merchant
        ? {
            id: movement.merchant.id,
            name: movement.merchant.name,
          }
        : null,
      createdAt: movement.createdAt,
    };

    let response: OneMovementResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Movement retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  async update(
    id: number,
    merchant_id: number,
    updateMovementDto: UpdateMovementDto,
  ): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }
    const merchantId = merchant_id;
    const { stockItemId, quantity, type, reference, reason } =
      updateMovementDto;

    const movement = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where('movement.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('movement.isActive = :isActive', { isActive: true })
      .getOne();

    if (!movement) {
      ErrorHandler.notFound(ErrorMessage.MOVEMENT_NOT_FOUND);
    }

    if (stockItemId) {
      const item = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.product', 'product')
        .where('item.id = :stockItemId', { stockItemId })
        .andWhere('product.merchantId = :merchantId', { merchantId })
        .andWhere('item.isActive = :isActive', { isActive: true })
        .getOne();

      if (!item) {
        ErrorHandler.notFound(ErrorMessage.ITEM_NOT_FOUND);
      }
      movement.item = item;
    }

    if (quantity) {
      movement.quantity = quantity;
    }

    if (type) {
      movement.type = type;
    }

    if (reference) {
      movement.reference = reference;
    }

    if (reason) {
      movement.reason = reason;
    }

    const updatedMovement = await this.movementRepository.save(movement);

    return this.findOne(updatedMovement.id, merchantId, 'Updated');
  }

  async remove(id: number, merchant_id: number): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }
    const merchantId = merchant_id;

    const movement = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where('movement.id = :id', { id })
      .andWhere('product.merchantId = :merchantId', { merchantId })
      .andWhere('movement.isActive = :isActive', { isActive: true })
      .getOne();

    if (!movement) {
      ErrorHandler.notFound(ErrorMessage.MOVEMENT_NOT_FOUND);
    }

    movement.isActive = false;
    const removedMovement = await this.movementRepository.save(movement);

    return this.findOne(removedMovement.id, merchantId, 'Deleted');
  }
}
