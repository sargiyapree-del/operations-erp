import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAXIMUM_PAGE_SIZE = 100;

export class InventoryServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type InventoryListQuery = {
  warehouseId?: unknown;
  productId?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type InventoryAdjustmentInput = {
  warehouseId?: unknown;
  productId?: unknown;
  quantityChange?: unknown;
  reference?: unknown;
  notes?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InventoryServiceError(`${fieldName} is required.`, 400);
  }
  return value.trim();
};

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new InventoryServiceError(`${fieldName} must be a string or null.`, 400);
  }
  return value.trim() || null;
};

const parseAdjustmentQuantity = (value: unknown): Prisma.Decimal => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new InventoryServiceError('quantityChange must be a non-zero number.', 400);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new InventoryServiceError('quantityChange must be a finite number.', 400);
  }

  try {
    const quantity = new Prisma.Decimal(value);
    if (!quantity.isFinite() || quantity.isZero()) {
      throw new InventoryServiceError('quantityChange must be a non-zero number.', 400);
    }
    return quantity;
  } catch (error) {
    if (error instanceof InventoryServiceError) throw error;
    throw new InventoryServiceError('quantityChange must be a valid number.', 400);
  }
};

const parsePositiveInteger = (value: unknown, fallback: number, fieldName: string, maximum?: number): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new InventoryServiceError(`${fieldName} must be a positive integer.`, 400);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    const limit = maximum ? ` no greater than ${maximum}` : '';
    throw new InventoryServiceError(`${fieldName} must be a positive integer${limit}.`, 400);
  }
  return parsed;
};

const balanceInclude = {
  warehouse: { select: { id: true, code: true, name: true } },
  product: { select: { id: true, sku: true, name: true, unitOfMeasure: true, isActive: true } },
} as const;

export const listInventory = async (query: InventoryListQuery) => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const pageSize = parsePositiveInteger(query.pageSize, 20, 'pageSize', MAXIMUM_PAGE_SIZE);
  const warehouseId = query.warehouseId === undefined ? undefined : normalizeRequiredString(query.warehouseId, 'warehouseId');
  const productId = query.productId === undefined ? undefined : normalizeRequiredString(query.productId, 'productId');
  const where: Prisma.InventoryBalanceWhereInput = {
    ...(warehouseId ? { warehouseId } : {}),
    ...(productId ? { productId } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.inventoryBalance.findMany({
      where,
      include: balanceInclude,
      orderBy: [{ warehouseId: 'asc' }, { productId: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventoryBalance.count({ where }),
  ]);

  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const getInventoryBalance = async (warehouseId: unknown, productId: unknown) => {
  const balance = await prisma.inventoryBalance.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: normalizeRequiredString(warehouseId, 'Warehouse id'),
        productId: normalizeRequiredString(productId, 'Product id'),
      },
    },
    include: balanceInclude,
  });
  if (!balance) throw new InventoryServiceError('Inventory balance not found.', 404);
  return balance;
};

export const adjustInventory = async (input: InventoryAdjustmentInput, createdById: string) => {
  if (!isRecord(input)) throw new InventoryServiceError('Request body must be a JSON object.', 400);

  const warehouseId = normalizeRequiredString(input.warehouseId, 'Warehouse id');
  const productId = normalizeRequiredString(input.productId, 'Product id');
  const quantityChange = parseAdjustmentQuantity(input.quantityChange);
  const reference = input.reference === undefined ? null : normalizeOptionalString(input.reference, 'Reference');
  const notes = input.notes === undefined ? null : normalizeOptionalString(input.notes, 'Notes');

  return prisma.$transaction(async (transaction) => {
    const [warehouse, product] = await Promise.all([
      transaction.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } }),
      transaction.product.findUnique({ where: { id: productId }, select: { id: true } }),
    ]);

    if (!warehouse) throw new InventoryServiceError('Warehouse not found.', 404);
    if (!product) throw new InventoryServiceError('Product not found.', 404);

    let balance;
    if (quantityChange.isPositive()) {
      balance = await transaction.inventoryBalance.upsert({
        where: { warehouseId_productId: { warehouseId, productId } },
        create: { warehouseId, productId, quantityOnHand: quantityChange },
        update: { quantityOnHand: { increment: quantityChange } },
      });
    } else {
      const updated = await transaction.inventoryBalance.updateMany({
        where: {
          warehouseId,
          productId,
          quantityOnHand: { gte: quantityChange.abs() },
        },
        data: { quantityOnHand: { increment: quantityChange } },
      });

      if (updated.count === 0) {
        throw new InventoryServiceError('Insufficient inventory for this adjustment.', 409);
      }

      balance = await transaction.inventoryBalance.findUniqueOrThrow({
        where: { warehouseId_productId: { warehouseId, productId } },
      });
    }

    const movement = await transaction.stockMovement.create({
      data: {
        warehouseId,
        productId,
        createdById,
        quantityChange,
        movementType: quantityChange.isPositive() ? 'STOCK_ADJUSTMENT_IN' : 'STOCK_ADJUSTMENT_OUT',
        reference,
        notes,
      },
    });

    return { balance, movement };
  });
};
