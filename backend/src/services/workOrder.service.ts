import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAXIMUM_PAGE_SIZE = 100;

export class WorkOrderServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type WorkOrderListQuery = {
  warehouseId?: unknown;
  status?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type WorkOrderInput = {
  workOrderNumber?: unknown;
  warehouseId?: unknown;
  scheduledDate?: unknown;
  notes?: unknown;
};

type MaterialInput = {
  productId?: unknown;
  quantityRequired?: unknown;
};

type OutputInput = {
  productId?: unknown;
  quantityPlanned?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new WorkOrderServiceError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const normalizeOptionalString = (
  value: unknown,
  fieldName: string,
): string | null => {
  if (value === null) return null;

  if (typeof value !== 'string') {
    throw new WorkOrderServiceError(`${fieldName} must be a string or null.`, 400);
  }

  return value.trim() || null;
};

const parsePositiveDecimal = (
  value: unknown,
  fieldName: string,
): Prisma.Decimal => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new WorkOrderServiceError(
      `${fieldName} must be a positive number.`,
      400,
    );
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new WorkOrderServiceError(
      `${fieldName} must be a finite number.`,
      400,
    );
  }

  try {
    const decimal = new Prisma.Decimal(value);

    if (!decimal.isFinite() || !decimal.isPositive()) {
      throw new WorkOrderServiceError(
        `${fieldName} must be greater than zero.`,
        400,
      );
    }

    return decimal;
  } catch (error) {
    if (error instanceof WorkOrderServiceError) throw error;

    throw new WorkOrderServiceError(
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
    throw new WorkOrderServiceError(
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

    throw new WorkOrderServiceError(
      `${fieldName} must be a positive integer${limit}.`,
      400,
    );
  }

  return parsed;
};

const workOrderInclude = {
  warehouse: {
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
  materials: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure: true,
        },
      },
    },
  },
  outputs: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unitOfMeasure: true,
        },
      },
    },
  },
} as const;

const validateWarehouse = async (
  transaction: Prisma.TransactionClient,
  warehouseId: string,
): Promise<void> => {
  const warehouse = await transaction.warehouse.findUnique({
    where: { id: warehouseId },
    select: { id: true },
  });

  if (!warehouse) {
    throw new WorkOrderServiceError('Warehouse not found.', 404);
  }
};

const validateProduct = async (
  transaction: Prisma.TransactionClient,
  productId: string,
): Promise<void> => {
  const product = await transaction.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });

  if (!product) {
    throw new WorkOrderServiceError('Product not found.', 404);
  }

  if (!product.isActive) {
    throw new WorkOrderServiceError('Product is inactive.', 409);
  }
};

const normalizeMaterials = (
  value: unknown,
): Array<{ productId: string; quantityRequired: Prisma.Decimal }> => {
  if (value === undefined) return [];

  if (!Array.isArray(value)) {
    throw new WorkOrderServiceError('Materials must be an array.', 400);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new WorkOrderServiceError(
        `Material at index ${index} must be an object.`,
        400,
      );
    }

    return {
      productId: normalizeRequiredString(
        item.productId,
        `Material ${index + 1} product id`,
      ),
      quantityRequired: parsePositiveDecimal(
        item.quantityRequired,
        `Material ${index + 1} quantity`,
      ),
    };
  });
};

const normalizeOutputs = (
  value: unknown,
): Array<{ productId: string; quantityPlanned: Prisma.Decimal }> => {
  if (value === undefined) return [];

  if (!Array.isArray(value)) {
    throw new WorkOrderServiceError('Outputs must be an array.', 400);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new WorkOrderServiceError(
        `Output at index ${index} must be an object.`,
        400,
      );
    }

    return {
      productId: normalizeRequiredString(
        item.productId,
        `Output ${index + 1} product id`,
      ),
      quantityPlanned: parsePositiveDecimal(
        item.quantityPlanned,
        `Output ${index + 1} quantity`,
      ),
    };
  });
};

export const createWorkOrder = async (
  input: WorkOrderInput & {
    materials?: unknown;
    outputs?: unknown;
  },
  createdById: string,
) => {
  if (!isRecord(input)) {
    throw new WorkOrderServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  const workOrderNumber = normalizeRequiredString(
    input.workOrderNumber,
    'Work order number',
  );

  const warehouseId = normalizeRequiredString(
    input.warehouseId,
    'Warehouse id',
  );

  const scheduledDate =
    input.scheduledDate === undefined || input.scheduledDate === null
      ? null
      : new Date(
          normalizeRequiredString(input.scheduledDate, 'Scheduled date'),
        );

  if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
    throw new WorkOrderServiceError('Scheduled date is invalid.', 400);
  }

  const notes =
    input.notes === undefined
      ? null
      : normalizeOptionalString(input.notes, 'Notes');

  const materials = normalizeMaterials(input.materials);
  const outputs = normalizeOutputs(input.outputs);

  if (materials.length === 0) {
    throw new WorkOrderServiceError(
      'At least one material is required.',
      400,
    );
  }

  if (outputs.length === 0) {
    throw new WorkOrderServiceError(
      'At least one output is required.',
      400,
    );
  }

  const materialProductIds = new Set<string>();

  for (const material of materials) {
    if (materialProductIds.has(material.productId)) {
      throw new WorkOrderServiceError(
        `Duplicate material product: ${material.productId}.`,
        400,
      );
    }

    materialProductIds.add(material.productId);
  }

  const outputProductIds = new Set<string>();

  for (const output of outputs) {
    if (outputProductIds.has(output.productId)) {
      throw new WorkOrderServiceError(
        `Duplicate output product: ${output.productId}.`,
        400,
      );
    }

    outputProductIds.add(output.productId);
  }

  return prisma.$transaction(async (transaction) => {
    await validateWarehouse(transaction, warehouseId);

    for (const material of materials) {
      await validateProduct(transaction, material.productId);
    }

    for (const output of outputs) {
      await validateProduct(transaction, output.productId);
    }

    try {
      return await transaction.workOrder.create({
        data: {
          workOrderNumber,
          warehouseId,
          scheduledDate,
          notes,
          createdById,
          materials: {
            create: materials.map((material) => ({
              productId: material.productId,
              quantityRequired: material.quantityRequired,
            })),
          },
          outputs: {
            create: outputs.map((output) => ({
              productId: output.productId,
              quantityPlanned: output.quantityPlanned,
            })),
          },
        },
        include: workOrderInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new WorkOrderServiceError(
            'A work order with this number already exists.',
            409,
          );
        }

        if (error.code === 'P2003') {
          throw new WorkOrderServiceError(
            'Invalid warehouse, product, or user reference.',
            400,
          );
        }
      }

      throw error;
    }
  });
};

export const listWorkOrders = async (
  query: WorkOrderListQuery,
) => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const pageSize = parsePositiveInteger(
    query.pageSize,
    20,
    'pageSize',
    MAXIMUM_PAGE_SIZE,
  );

  const warehouseId =
    query.warehouseId === undefined
      ? undefined
      : normalizeRequiredString(query.warehouseId, 'warehouseId');

  const status =
    query.status === undefined
      ? undefined
      : normalizeRequiredString(query.status, 'status');

  const where: Prisma.WorkOrderWhereInput = {
    ...(warehouseId ? { warehouseId } : {}),
    ...(status ? { status: status as Prisma.EnumWorkOrderStatusFilter } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.workOrder.findMany({
      where,
      include: workOrderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workOrder.count({ where }),
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

export const getWorkOrderById = async (id: unknown) => {
  const workOrderId = normalizeRequiredString(id, 'Work order id');

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: workOrderInclude,
  });

  if (!workOrder) {
    throw new WorkOrderServiceError('Work order not found.', 404);
  }

  return workOrder;
};

export const updateWorkOrder = async (
  id: unknown,
  input: WorkOrderInput,
) => {
  if (!isRecord(input)) {
    throw new WorkOrderServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  const workOrderId = normalizeRequiredString(id, 'Work order id');

  const data: Prisma.WorkOrderUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(input, 'workOrderNumber')) {
    data.workOrderNumber = normalizeRequiredString(
      input.workOrderNumber,
      'Work order number',
    );
  }

  if (Object.prototype.hasOwnProperty.call(input, 'warehouseId')) {
    const warehouseId = normalizeRequiredString(
      input.warehouseId,
      'Warehouse id',
    );

    await validateWarehouse(prisma, warehouseId);

    data.warehouse = {
      connect: { id: warehouseId },
    };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'scheduledDate')) {
    if (input.scheduledDate === null) {
      data.scheduledDate = null;
    } else {
      const date = new Date(
        normalizeRequiredString(input.scheduledDate, 'Scheduled date'),
      );

      if (Number.isNaN(date.getTime())) {
        throw new WorkOrderServiceError(
          'Scheduled date is invalid.',
          400,
        );
      }

      data.scheduledDate = date;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'notes')) {
    data.notes = normalizeOptionalString(input.notes, 'Notes');
  }

  if (Object.keys(data).length === 0) {
    throw new WorkOrderServiceError(
      'At least one work order field must be provided.',
      400,
    );
  }

  try {
    return await prisma.workOrder.update({
      where: { id: workOrderId },
      data,
      include: workOrderInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new WorkOrderServiceError(
          'A work order with this number already exists.',
          409,
        );
      }

      if (error.code === 'P2025') {
        throw new WorkOrderServiceError(
          'Work order not found.',
          404,
        );
      }
    }

    throw error;
  }
};

export const releaseWorkOrder = async (id: unknown) => {
  const workOrderId = normalizeRequiredString(id, 'Work order id');

  return prisma.$transaction(async (transaction) => {
    const workOrder = await transaction.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        materials: true,
        outputs: true,
      },
    });

    if (!workOrder) {
      throw new WorkOrderServiceError('Work order not found.', 404);
    }

    if (workOrder.status !== 'DRAFT') {
      throw new WorkOrderServiceError(
        'Only draft work orders can be released.',
        409,
      );
    }

    if (workOrder.materials.length === 0 || workOrder.outputs.length === 0) {
      throw new WorkOrderServiceError(
        'Work order must have materials and outputs before release.',
        409,
      );
    }

    return transaction.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'RELEASED' },
      include: workOrderInclude,
    });
  });
};

export const startWorkOrder = async (id: unknown) => {
  const workOrderId = normalizeRequiredString(id, 'Work order id');

  return prisma.$transaction(async (transaction) => {
    const workOrder = await transaction.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      throw new WorkOrderServiceError('Work order not found.', 404);
    }

    if (workOrder.status !== 'RELEASED') {
      throw new WorkOrderServiceError(
        'Only released work orders can be started.',
        409,
      );
    }

    return transaction.workOrder.update({
      where: { id: workOrderId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: workOrderInclude,
    });
  });
};

export const completeWorkOrder = async (
  id: unknown,
  createdById: string,
) => {
  const workOrderId = normalizeRequiredString(id, 'Work order id');

  return prisma.$transaction(async (transaction) => {
    const workOrder = await transaction.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        materials: true,
        outputs: true,
      },
    });

    if (!workOrder) {
      throw new WorkOrderServiceError('Work order not found.', 404);
    }

    if (workOrder.status !== 'IN_PROGRESS') {
      throw new WorkOrderServiceError(
        'Only work orders in progress can be completed.',
        409,
      );
    }

    for (const material of workOrder.materials) {
      const remaining =
        new Prisma.Decimal(material.quantityRequired).minus(
          material.quantityConsumed,
        );

      if (remaining.isNegative()) {
        throw new WorkOrderServiceError(
          `Consumed quantity exceeds required quantity for product ${material.productId}.`,
          409,
        );
      }

      if (remaining.isZero()) continue;

      const updated = await transaction.inventoryBalance.updateMany({
        where: {
          warehouseId: workOrder.warehouseId,
          productId: material.productId,
          quantityOnHand: {
            gte: remaining,
          },
        },
        data: {
          quantityOnHand: {
            decrement: remaining,
          },
        },
      });

      if (updated.count === 0) {
        throw new WorkOrderServiceError(
          `Insufficient inventory for material product ${material.productId}.`,
          409,
        );
      }

      await transaction.stockMovement.create({
        data: {
          warehouseId: workOrder.warehouseId,
          productId: material.productId,
          movementType: 'WORK_ORDER_CONSUMPTION',
          quantityChange: remaining.negated(),
          reference: workOrder.workOrderNumber,
          notes: 'Work order material consumption',
          createdById,
          workOrderId: workOrder.id,
          workOrderMaterialId: material.id,
        },
      });

      await transaction.workOrderMaterial.update({
        where: { id: material.id },
        data: {
          quantityConsumed: {
            increment: remaining,
          },
        },
      });
    }

    for (const output of workOrder.outputs) {
      const remaining =
        new Prisma.Decimal(output.quantityPlanned).minus(
          output.quantityProduced,
        );

      if (remaining.isNegative()) {
        throw new WorkOrderServiceError(
          `Produced quantity exceeds planned quantity for product ${output.productId}.`,
          409,
        );
      }

      if (remaining.isZero()) continue;

      await transaction.inventoryBalance.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: workOrder.warehouseId,
            productId: output.productId,
          },
        },
        create: {
          warehouseId: workOrder.warehouseId,
          productId: output.productId,
          quantityOnHand: remaining,
        },
        update: {
          quantityOnHand: {
            increment: remaining,
          },
        },
      });

      await transaction.stockMovement.create({
        data: {
          warehouseId: workOrder.warehouseId,
          productId: output.productId,
          movementType: 'WORK_ORDER_OUTPUT',
          quantityChange: remaining,
          reference: workOrder.workOrderNumber,
          notes: 'Work order output',
          createdById,
          workOrderId: workOrder.id,
          workOrderOutputId: output.id,
        },
      });

      await transaction.workOrderOutput.update({
        where: { id: output.id },
        data: {
          quantityProduced: {
            increment: remaining,
          },
        },
      });
    }

    return transaction.workOrder.update({
      where: { id: workOrder.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: workOrderInclude,
    });
  });
};
