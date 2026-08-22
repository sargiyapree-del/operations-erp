import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAXIMUM_PAGE_SIZE = 100;

export class SalesOrderServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type SalesOrderListQuery = {
  status?: unknown;
  customerId?: unknown;
  warehouseId?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type SalesOrderInput = {
  orderNumber?: unknown;
  customerId?: unknown;
  warehouseId?: unknown;
  notes?: unknown;
  lines?: unknown;
};

type NormalizedLine = {
  productId: string;
  quantityOrdered: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value);

const normalizeRequiredString = (
  value: unknown,
  fieldName: string,
): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SalesOrderServiceError(
      `${fieldName} is required.`,
      400,
    );
  }

  return value.trim();
};

const normalizeOptionalString = (
  value: unknown,
  fieldName: string,
): string | null => {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new SalesOrderServiceError(
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
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    throw new SalesOrderServiceError(
      `${fieldName} must be a positive number.`,
      400,
    );
  }

  try {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite() || decimal.lte(0)) {
      throw new SalesOrderServiceError(
        `${fieldName} must be greater than zero.`,
        400,
      );
    }

    return decimal;
  } catch (error) {
    if (error instanceof SalesOrderServiceError) {
      throw error;
    }

    throw new SalesOrderServiceError(
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
  if (value === undefined) {
    return fallback;
  }

  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value)
  ) {
    throw new SalesOrderServiceError(
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
    const limit =
      maximum !== undefined
        ? ` no greater than ${maximum}`
        : '';

    throw new SalesOrderServiceError(
      `${fieldName} must be a positive integer${limit}.`,
      400,
    );
  }

  return parsed;
};

const orderInclude = {
  customer: {
    select: {
      id: true,
      customerCode: true,
      name: true,
      email: true,
      phone: true,
    },
  },

  createdBy: {
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
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

const normalizeLines = (
  value: unknown,
): NormalizedLine[] => {
  if (!Array.isArray(value)) {
    throw new SalesOrderServiceError(
      'Lines must be an array.',
      400,
    );
  }

  if (value.length === 0) {
    throw new SalesOrderServiceError(
      'At least one sales order line is required.',
      400,
    );
  }

  const productIds = new Set<string>();
  const lines: NormalizedLine[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      throw new SalesOrderServiceError(
        'Each sales order line must be an object.',
        400,
      );
    }

    const productId = normalizeRequiredString(
      item.productId,
      'Product id',
    );

    if (productIds.has(productId)) {
      throw new SalesOrderServiceError(
        `Duplicate product in sales order: ${productId}.`,
        400,
      );
    }

    productIds.add(productId);

    const quantityOrdered = parsePositiveDecimal(
      item.quantityOrdered,
      'Quantity ordered',
    );

    const unitPrice = parsePositiveDecimal(
      item.unitPrice,
      'Unit price',
    );

    lines.push({
      productId,
      quantityOrdered,
      unitPrice,
    });
  }

  return lines;
};

const validateCustomer = async (
  transaction: Prisma.TransactionClient,
  customerId: string,
) => {
  const customer =
    await transaction.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!customer) {
    throw new SalesOrderServiceError(
      'Customer not found.',
      404,
    );
  }

  if (!customer.isActive) {
    throw new SalesOrderServiceError(
      'Customer is inactive.',
      409,
    );
  }
};

const validateProducts = async (
  transaction: Prisma.TransactionClient,
  lines: NormalizedLine[],
) => {
  for (const line of lines) {
    const product =
      await transaction.product.findUnique({
        where: { id: line.productId },
        select: {
          id: true,
          isActive: true,
        },
      });

    if (!product) {
      throw new SalesOrderServiceError(
        `Product ${line.productId} not found.`,
        404,
      );
    }

    if (!product.isActive) {
      throw new SalesOrderServiceError(
        `Product ${line.productId} is inactive.`,
        409,
      );
    }
  }
};

const validateWarehouse = async (
  transaction: Prisma.TransactionClient,
  warehouseId: string,
) => {
  const warehouse =
    await transaction.warehouse.findUnique({
      where: { id: warehouseId },
      select: {
        id: true,
        isActive: true,
      },
    });

  if (!warehouse) {
    throw new SalesOrderServiceError(
      'Warehouse not found.',
      404,
    );
  }

  if (!warehouse.isActive) {
    throw new SalesOrderServiceError(
      'Warehouse is inactive.',
      409,
    );
  }
};

export const createSalesOrder = async (
  input: SalesOrderInput,
  createdById: string,
) => {
  if (!isRecord(input)) {
    throw new SalesOrderServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  const orderNumber = normalizeRequiredString(
    input.orderNumber,
    'Order number',
  );

  const customerId = normalizeRequiredString(
    input.customerId,
    'Customer id',
  );

  const warehouseId = normalizeRequiredString(
    input.warehouseId,
    'Warehouse id',
  );

  const notes =
    input.notes === undefined
      ? null
      : normalizeOptionalString(
          input.notes,
          'Notes',
        );

  const lines = normalizeLines(input.lines);

  return prisma.$transaction(
    async (transaction) => {
      await validateCustomer(
        transaction,
        customerId,
      );

      await validateWarehouse(
        transaction,
        warehouseId,
      );

      await validateProducts(
        transaction,
        lines,
      );

      try {
        return await transaction.salesOrder.create({
          data: {
            orderNumber,
            customerId,
            warehouseId,
            notes,
            createdById,

            lines: {
              create: lines.map((line) => ({
                productId: line.productId,
                quantityOrdered:
                  line.quantityOrdered,
                unitPrice: line.unitPrice,
              })),
            },
          },

          include: orderInclude,
        });
      } catch (error) {
        if (
          error instanceof
          Prisma.PrismaClientKnownRequestError
        ) {
          if (error.code === 'P2002') {
            throw new SalesOrderServiceError(
              'A sales order with this number already exists.',
              409,
            );
          }

          if (error.code === 'P2003') {
            throw new SalesOrderServiceError(
              'Invalid customer, warehouse, product, or user reference.',
              400,
            );
          }
        }

        throw error;
      }
    },
  );
};

export const listSalesOrders = async (
  query: SalesOrderListQuery,
) => {
  const page = parsePositiveInteger(
    query.page,
    1,
    'page',
  );

  const pageSize = parsePositiveInteger(
    query.pageSize,
    20,
    'pageSize',
    MAXIMUM_PAGE_SIZE,
  );

  const status =
    query.status === undefined
      ? undefined
      : normalizeRequiredString(
          query.status,
          'status',
        );

  const customerId =
    query.customerId === undefined
      ? undefined
      : normalizeRequiredString(
          query.customerId,
          'customerId',
        );

  const warehouseId =
    query.warehouseId === undefined
      ? undefined
      : normalizeRequiredString(
          query.warehouseId,
          'warehouseId',
        );

  const where: Prisma.SalesOrderWhereInput = {
    ...(status
      ? {
          status:
            status as Prisma.EnumSalesOrderStatusFilter,
        }
      : {}),

    ...(customerId
      ? {
          customerId,
        }
      : {}),

    ...(warehouseId
      ? {
          warehouseId,
        }
      : {}),
  };

  const [data, total] =
    await prisma.$transaction([
      prisma.salesOrder.findMany({
        where,
        include: orderInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      prisma.salesOrder.count({
        where,
      }),
    ]);

  return {
    data,

    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(
        total / pageSize,
      ),
    },
  };
};

export const getSalesOrderById = async (
  id: unknown,
) => {
  const orderId =
    normalizeRequiredString(
      id,
      'Sales order id',
    );

  const order =
    await prisma.salesOrder.findUnique({
      where: {
        id: orderId,
      },
      include: orderInclude,
    });

  if (!order) {
    throw new SalesOrderServiceError(
      'Sales order not found.',
      404,
    );
  }

  return order;
};

export const assignWarehouseToSalesOrder =
  async (
    id: unknown,
    warehouseId: unknown,
  ) => {
    const orderId =
      normalizeRequiredString(
        id,
        'Sales order id',
      );

    const warehouseIdValue =
      normalizeRequiredString(
        warehouseId,
        'Warehouse id',
      );

    return prisma.$transaction(
      async (transaction) => {
        const order =
          await transaction.salesOrder.findUnique(
            {
              where: {
                id: orderId,
              },
            },
          );

        if (!order) {
          throw new SalesOrderServiceError(
            'Sales order not found.',
            404,
          );
        }

        if (order.status !== 'DRAFT') {
          throw new SalesOrderServiceError(
            'Warehouse can only be assigned to a draft sales order.',
            409,
          );
        }

        await validateWarehouse(
          transaction,
          warehouseIdValue,
        );

        return transaction.salesOrder.update({
          where: {
            id: orderId,
          },

          data: {
            warehouseId:
              warehouseIdValue,
          },

          include: orderInclude,
        });
      },
    );
  };

export const confirmSalesOrder = async (
  id: unknown,
) => {
  const orderId =
    normalizeRequiredString(
      id,
      'Sales order id',
    );

  return prisma.$transaction(
    async (transaction) => {
      const order =
        await transaction.salesOrder.findUnique(
          {
            where: {
              id: orderId,
            },
            include: {
              lines: true,
            },
          },
        );

      if (!order) {
        throw new SalesOrderServiceError(
          'Sales order not found.',
          404,
        );
      }

      if (order.status !== 'DRAFT') {
        throw new SalesOrderServiceError(
          'Only draft sales orders can be confirmed.',
          409,
        );
      }

      if (order.lines.length === 0) {
        throw new SalesOrderServiceError(
          'A sales order must contain at least one line.',
          400,
        );
      }

      if (!order.warehouseId) {
        throw new SalesOrderServiceError(
          'A warehouse must be assigned before confirming the sales order.',
          409,
        );
      }
for (const line of order.lines) {
  const inventory = await transaction.inventoryBalance.findUnique({
    where: {
      warehouseId_productId: {
        warehouseId: order.warehouseId,
        productId: line.productId,
      },
    },
  });

  if (!inventory) {
    throw new SalesOrderServiceError(
      `No inventory record found for product ${line.productId}.`,
      409,
    );
  }

  const availableQuantity = inventory.quantityOnHand.minus(
    inventory.reservedQuantity,
  );

  if (availableQuantity.lt(line.quantityOrdered)) {
    throw new SalesOrderServiceError(
      `Insufficient available stock for product ${line.productId}. Available: ${availableQuantity.toString()}, required: ${line.quantityOrdered.toString()}.`,
      409,
    );
  }
}

for (const line of order.lines) {
  await transaction.inventoryBalance.update({
    where: {
      warehouseId_productId: {
        warehouseId: order.warehouseId,
        productId: line.productId,
      },
    },
    data: {
      reservedQuantity: {
        increment: line.quantityOrdered,
      },
    },
  });
}
      return transaction.salesOrder.update({
        where: {
          id: orderId,
        },

        data: {
          status: 'CONFIRMED',
        },

        include: orderInclude,
      });
    },
  );
};

export const fulfillSalesOrder = async (
  id: unknown,
  createdById: string,
) => {
  const orderId = normalizeRequiredString(
    id,
    'Sales order id',
  );

  return prisma.$transaction(
    async (transaction) => {
      const order = await transaction.salesOrder.findUnique({
        where: {
          id: orderId,
        },
        include: {
          lines: true,
        },
      });

      if (!order) {
        throw new SalesOrderServiceError(
          'Sales order not found.',
          404,
        );
      }

      if (
        order.status !== 'CONFIRMED' &&
        order.status !== 'PARTIALLY_FULFILLED'
      ) {
        throw new SalesOrderServiceError(
          'Only confirmed or partially fulfilled sales orders can be fulfilled.',
          409,
        );
      }

      if (order.lines.length === 0) {
        throw new SalesOrderServiceError(
          'A sales order must contain at least one line.',
          400,
        );
      }

      if (!order.warehouseId) {
        throw new SalesOrderServiceError(
          'Sales order fulfillment requires a warehouse.',
          409,
        );
      }

      await validateWarehouse(
        transaction,
        order.warehouseId,
      );

      /*
       * Validate stock for every order line first.
       * This prevents a partial transaction where one product
       * gets deducted before another product fails.
       */
      for (const line of order.lines) {
        const inventory =
          await transaction.inventoryBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: order.warehouseId,
                productId: line.productId,
              },
            },
          });

        if (!inventory) {
          throw new SalesOrderServiceError(
            `No inventory record found for product ${line.productId}.`,
            409,
          );
        }

        const quantityToFulfill =
          line.quantityOrdered.minus(line.quantityFulfilled);

        if (quantityToFulfill.lte(0)) {
          continue;
        }

        if (
          inventory.quantityOnHand.lt(quantityToFulfill)
        ) {
          throw new SalesOrderServiceError(
            `Insufficient stock for product ${line.productId}. Available: ${inventory.quantityOnHand.toString()}, required: ${quantityToFulfill.toString()}.`,
            409,
          );
        }
      }

      /*
       * Stock is available for every line.
       * Now deduct stock and create stock movements.
       */
      for (const line of order.lines) {
        const quantityToFulfill =
          line.quantityOrdered.minus(line.quantityFulfilled);

        if (quantityToFulfill.lte(0)) {
          continue;
        }

        const inventory =
          await transaction.inventoryBalance.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: order.warehouseId,
                productId: line.productId,
              },
            },
          });

        if (!inventory) {
          throw new SalesOrderServiceError(
            `Inventory record not found for product ${line.productId}.`,
            409,
          );
        }

        await transaction.inventoryBalance.update({
          where: {
            warehouseId_productId: {
              warehouseId: order.warehouseId,
              productId: line.productId,
            },
          },
          data: {
            quantityOnHand: {
              decrement: quantityToFulfill,
            },
          },
        });

        await transaction.salesOrderLine.update({
          where: {
            id: line.id,
          },
          data: {
            quantityFulfilled: {
              increment: quantityToFulfill,
            },
          },
        });

        await transaction.stockMovement.create({
          data: {
            warehouseId: order.warehouseId,
            productId: line.productId,
            movementType: 'SALES_ORDER_FULFILMENT',
            quantityChange: quantityToFulfill.negated(),
            reference: order.orderNumber,
            notes: `Stock issued for sales order ${order.orderNumber}.`,
            createdById,
            salesOrderId: order.id,
            salesOrderLineId: line.id,
          },
        });
      }

      return transaction.salesOrder.update({
        where: {
          id: orderId,
        },

        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
        },

        include: orderInclude,
      });
    },
  );
};