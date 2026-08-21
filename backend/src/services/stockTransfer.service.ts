import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAXIMUM_PAGE_SIZE = 100;

export class StockTransferServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type StockTransferListQuery = {
  sourceWarehouseId?: unknown;
  destinationWarehouseId?: unknown;
  status?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type StockTransferInput = {
  transferNumber?: unknown;
  sourceWarehouseId?: unknown;
  destinationWarehouseId?: unknown;
  notes?: unknown;
  lines?: unknown;
};

type TransferLineInput = {
  productId?: unknown;
  quantityRequested?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRequiredString = (
  value: unknown,
  fieldName: string,
): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StockTransferServiceError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const normalizeOptionalString = (
  value: unknown,
  fieldName: string,
): string | null => {
  if (value === null) return null;

  if (typeof value !== 'string') {
    throw new StockTransferServiceError(
      `${fieldName} must be a string or null.`,
      400,
    );
  }

  return value.trim() || null;
};

const parsePositiveDecimal = (
  value: unknown,
  fieldName: string,
): Prisma.Decimal => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new StockTransferServiceError(
      `${fieldName} must be a positive number.`,
      400,
    );
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new StockTransferServiceError(
      `${fieldName} must be a finite number.`,
      400,
    );
  }

  try {
    const quantity = new Prisma.Decimal(value);

    if (!quantity.isFinite() || quantity.isZero() || quantity.isNegative()) {
      throw new StockTransferServiceError(
        `${fieldName} must be a positive number.`,
        400,
      );
    }

    return quantity;
  } catch (error) {
    if (error instanceof StockTransferServiceError) throw error;

    throw new StockTransferServiceError(
      `${fieldName} must be a valid number.`,
      400,
    );
  }
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  maximum?: number,
): number => {
  if (value === undefined) return fallback;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new StockTransferServiceError(
      `${fieldName} must be a positive integer.`,
      400,
    );
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    (maximum !== undefined && parsed > maximum)
  ) {
    const limit = maximum ? ` no greater than ${maximum}` : '';

    throw new StockTransferServiceError(
      `${fieldName} must be a positive integer${limit}.`,
      400,
    );
  }

  return parsed;
};

const transferInclude = {
  sourceWarehouse: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  destinationWarehouse: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  dispatchedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  lines: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure: true,
          isActive: true,
        },
      },
    },
  },
} as const;

export const listStockTransfers = async (
  query: StockTransferListQuery,
) => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const pageSize = parsePositiveInteger(
    query.pageSize,
    20,
    'pageSize',
    MAXIMUM_PAGE_SIZE,
  );

  const sourceWarehouseId =
    query.sourceWarehouseId === undefined
      ? undefined
      : normalizeRequiredString(
          query.sourceWarehouseId,
          'sourceWarehouseId',
        );

  const destinationWarehouseId =
    query.destinationWarehouseId === undefined
      ? undefined
      : normalizeRequiredString(
          query.destinationWarehouseId,
          'destinationWarehouseId',
        );

  const status =
    query.status === undefined
      ? undefined
      : normalizeRequiredString(query.status, 'status');

  const where: Prisma.StockTransferWhereInput = {
    ...(sourceWarehouseId ? { sourceWarehouseId } : {}),
    ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
    ...(status ? { status: status as Prisma.EnumStockTransferStatusFilter } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.stockTransfer.findMany({
      where,
      include: transferInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockTransfer.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export const getStockTransferById = async (id: unknown) => {
  const transferId = normalizeRequiredString(id, 'Transfer id');

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: transferInclude,
  });

  if (!transfer) {
    throw new StockTransferServiceError(
      'Stock transfer not found.',
      404,
    );
  }

  return transfer;
};

export const createStockTransfer = async (
  input: StockTransferInput,
  createdById: string,
) => {
  if (!isRecord(input)) {
    throw new StockTransferServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  const transferNumber = normalizeRequiredString(
    input.transferNumber,
    'Transfer number',
  );

  const sourceWarehouseId = normalizeRequiredString(
    input.sourceWarehouseId,
    'Source warehouse id',
  );

  const destinationWarehouseId = normalizeRequiredString(
    input.destinationWarehouseId,
    'Destination warehouse id',
  );

  const notes =
    input.notes === undefined
      ? null
      : normalizeOptionalString(input.notes, 'Notes');

  if (sourceWarehouseId === destinationWarehouseId) {
    throw new StockTransferServiceError(
      'Source and destination warehouses must be different.',
      400,
    );
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new StockTransferServiceError(
      'At least one transfer line is required.',
      400,
    );
  }

  const lines: Array<{
    productId: string;
    quantityRequested: Prisma.Decimal;
  }> = [];

  const productIds = new Set<string>();

  for (const line of input.lines) {
    if (!isRecord(line)) {
      throw new StockTransferServiceError(
        'Each transfer line must be a JSON object.',
        400,
      );
    }

    const productId = normalizeRequiredString(
      line.productId,
      'Product id',
    );

    if (productIds.has(productId)) {
      throw new StockTransferServiceError(
        'Each product can appear only once in a transfer.',
        400,
      );
    }

    productIds.add(productId);

    const quantityRequested = parsePositiveDecimal(
      line.quantityRequested,
      'quantityRequested',
    );

    lines.push({
      productId,
      quantityRequested,
    });
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const [existingTransfer, sourceWarehouse, destinationWarehouse] =
        await Promise.all([
          transaction.stockTransfer.findUnique({
            where: { transferNumber },
            select: { id: true },
          }),
          transaction.warehouse.findUnique({
            where: { id: sourceWarehouseId },
            select: { id: true },
          }),
          transaction.warehouse.findUnique({
            where: { id: destinationWarehouseId },
            select: { id: true },
          }),
        ]);

      if (existingTransfer) {
        throw new StockTransferServiceError(
          'A transfer with this number already exists.',
          409,
        );
      }

      if (!sourceWarehouse) {
        throw new StockTransferServiceError(
          'Source warehouse not found.',
          404,
        );
      }

      if (!destinationWarehouse) {
        throw new StockTransferServiceError(
          'Destination warehouse not found.',
          404,
        );
      }

      const products = await transaction.product.findMany({
        where: {
          id: {
            in: [...productIds],
          },
        },
        select: {
          id: true,
          isActive: true,
        },
      });

      if (products.length !== productIds.size) {
        throw new StockTransferServiceError(
          'One or more products were not found.',
          404,
        );
      }

      const inactiveProduct = products.find(
        (product) => !product.isActive,
      );

      if (inactiveProduct) {
        throw new StockTransferServiceError(
          'Inactive products cannot be transferred.',
          400,
        );
      }

      const transfer = await transaction.stockTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId,
          destinationWarehouseId,
          notes,
          createdById,
          lines: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantityRequested: line.quantityRequested,
            })),
          },
        },
        include: transferInclude,
      });

      return transfer;
    });
  } catch (error) {
    if (error instanceof StockTransferServiceError) throw error;

    throw error;
  }
};

export const dispatchStockTransfer = async (
  id: unknown,
  dispatchedById: string,
) => {
  const transferId = normalizeRequiredString(id, 'Transfer id');

  return prisma.$transaction(async (transaction) => {
    const transfer = await transaction.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        lines: true,
      },
    });

    if (!transfer) {
      throw new StockTransferServiceError(
        'Stock transfer not found.',
        404,
      );
    }

    if (transfer.status !== 'DRAFT') {
      throw new StockTransferServiceError(
        'Only draft stock transfers can be dispatched.',
        409,
      );
    }

    if (transfer.lines.length === 0) {
      throw new StockTransferServiceError(
        'A transfer must contain at least one line.',
        400,
      );
    }

    for (const line of transfer.lines) {
      const updated = await transaction.inventoryBalance.updateMany({
        where: {
          warehouseId: transfer.sourceWarehouseId,
          productId: line.productId,
          quantityOnHand: {
            gte: line.quantityRequested,
          },
        },
        data: {
          quantityOnHand: {
            decrement: line.quantityRequested,
          },
        },
      });

      if (updated.count === 0) {
        throw new StockTransferServiceError(
          `Insufficient inventory for product ${line.productId}.`,
          409,
        );
      }
    }
for (const line of transfer.lines) {
      await transaction.stockTransferLine.update({
        where: { id: line.id },
        data: {
          quantityDispatched: line.quantityRequested,
        },
      });

      await transaction.stockMovement.create({
        data: {
          warehouseId: transfer.sourceWarehouseId,
          productId: line.productId,
          movementType: 'TRANSFER_DISPATCH',
          quantityChange: line.quantityRequested.negated(),
          createdById: dispatchedById,
          stockTransferId: transferId,
          stockTransferLineId: line.id,
          reference: transfer.transferNumber,
          notes: transfer.notes,
        },
      });
    }

    return transaction.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'DISPATCHED',
        dispatchedById,
        dispatchedAt: new Date(),
      },
      include: transferInclude,
    });
  });
};

export const receiveStockTransfer = async (
  id: unknown,
  receivedById: string,
) => {
  const transferId = normalizeRequiredString(id, 'Transfer id');

  return prisma.$transaction(async (transaction) => {
    const transfer = await transaction.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        lines: true,
      },
    });

    if (!transfer) {
      throw new StockTransferServiceError(
        'Stock transfer not found.',
        404,
      );
    }

    if (transfer.status !== 'DISPATCHED') {
      throw new StockTransferServiceError(
        'Only dispatched stock transfers can be received.',
        409,
      );
    }

    for (const line of transfer.lines) {
      await transaction.inventoryBalance.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: transfer.destinationWarehouseId,
            productId: line.productId,
          },
        },
        create: {
          warehouseId: transfer.destinationWarehouseId,
          productId: line.productId,
          quantityOnHand: line.quantityDispatched,
        },
        update: {
          quantityOnHand: {
            increment: line.quantityDispatched,
          },
        },
      });

      await transaction.stockTransferLine.update({
        where: { id: line.id },
        data: {
          quantityReceived: line.quantityDispatched,
        },
      });

      await transaction.stockMovement.create({
        data: {
          warehouseId: transfer.destinationWarehouseId,
          productId: line.productId,
          movementType: 'TRANSFER_RECEIPT',
          quantityChange: line.quantityDispatched,
          createdById: receivedById,
          stockTransferId: transferId,
          stockTransferLineId: line.id,
          reference: transfer.transferNumber,
          notes: transfer.notes,
        },
      });
    }

    return transaction.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: 'RECEIVED',
        receivedById,
        receivedAt: new Date(),
      },
      include: transferInclude,
    });
  });
};

export const cancelStockTransfer = async (id: unknown) => {
  const transferId = normalizeRequiredString(id, 'Transfer id');

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!transfer) {
    throw new StockTransferServiceError(
      'Stock transfer not found.',
      404,
    );
  }

  if (transfer.status !== 'DRAFT') {
    throw new StockTransferServiceError(
      'Only draft stock transfers can be cancelled.',
      409,
    );
  }

  return prisma.stockTransfer.update({
    where: { id: transferId },
    data: {
      status: 'CANCELLED',
    },
    include: transferInclude,
  });
};

