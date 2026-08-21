import { Prisma, PrismaClient, type Warehouse } from '@prisma/client';

const prisma = new PrismaClient();
const MAXIMUM_PAGE_SIZE = 100;

export class WarehouseServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type WarehouseInput = {
  code?: unknown;
  name?: unknown;
  address?: unknown;
  isActive?: unknown;
};

type WarehouseListQuery = {
  search?: unknown;
  isActive?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwnProperty = (value: Record<string, unknown>, property: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, property);

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new WarehouseServiceError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === null) return null;

  if (typeof value !== 'string') {
    throw new WarehouseServiceError(`${fieldName} must be a string or null.`, 400);
  }

  return value.trim() || null;
};

const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  fieldName: string,
  maximum?: number,
): number => {
  if (value === undefined) return fallback;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new WarehouseServiceError(`${fieldName} must be a positive integer.`, 400);
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    (maximum !== undefined && parsed > maximum)
  ) {
    const limit = maximum ? ` no greater than ${maximum}` : '';

    throw new WarehouseServiceError(
      `${fieldName} must be a positive integer${limit}.`,
      400,
    );
  }

  return parsed;
};

const parseIsActive = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new WarehouseServiceError('isActive must be true or false.', 400);
};

const ensureKnownFields = (input: Record<string, unknown>): void => {
  const allowedFields = new Set(['code', 'name', 'address', 'isActive']);

  const unknownField = Object.keys(input).find(
    (key) => !allowedFields.has(key),
  );

  if (unknownField) {
    throw new WarehouseServiceError(
      `Unsupported field: ${unknownField}.`,
      400,
    );
  }
};

const toCreateData = (
  input: WarehouseInput,
): Prisma.WarehouseCreateInput => {
  if (!isRecord(input)) {
    throw new WarehouseServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  ensureKnownFields(input);

  const data: Prisma.WarehouseCreateInput = {
    code: normalizeRequiredString(input.code, 'Warehouse code'),
    name: normalizeRequiredString(input.name, 'Name'),
  };

  if (hasOwnProperty(input, 'address')) {
    data.address = normalizeOptionalString(input.address, 'Address');
  }

  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') {
      throw new WarehouseServiceError(
        'isActive must be a boolean.',
        400,
      );
    }

    data.isActive = input.isActive;
  }

  return data;
};

const toUpdateData = (
  input: WarehouseInput,
): Prisma.WarehouseUpdateInput => {
  if (!isRecord(input)) {
    throw new WarehouseServiceError(
      'Request body must be a JSON object.',
      400,
    );
  }

  ensureKnownFields(input);

  const data: Prisma.WarehouseUpdateInput = {};

  if (hasOwnProperty(input, 'code')) {
    data.code = normalizeRequiredString(
      input.code,
      'Warehouse code',
    );
  }

  if (hasOwnProperty(input, 'name')) {
    data.name = normalizeRequiredString(input.name, 'Name');
  }

  if (hasOwnProperty(input, 'address')) {
    data.address = normalizeOptionalString(input.address, 'Address');
  }

  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') {
      throw new WarehouseServiceError(
        'isActive must be a boolean.',
        400,
      );
    }

    data.isActive = input.isActive;
  }

  if (Object.keys(data).length === 0) {
    throw new WarehouseServiceError(
      'At least one warehouse field must be provided.',
      400,
    );
  }

  return data;
};

const handlePrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new WarehouseServiceError(
        'A warehouse with this code already exists.',
        409,
      );
    }

    if (error.code === 'P2025') {
      throw new WarehouseServiceError(
        'Warehouse not found.',
        404,
      );
    }
  }

  throw error;
};

export const createWarehouse = async (
  input: WarehouseInput,
): Promise<Warehouse> => {
  try {
    return await prisma.warehouse.create({
      data: toCreateData(input),
    });
  } catch (error) {
    return handlePrismaError(error);
  }
};

export const listWarehouses = async (
  query: WarehouseListQuery,
): Promise<{
  data: Warehouse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
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

  const isActive = parseIsActive(query.isActive);

  if (
    query.search !== undefined &&
    typeof query.search !== 'string'
  ) {
    throw new WarehouseServiceError(
      'search must be a string.',
      400,
    );
  }

  const search =
    typeof query.search === 'string'
      ? query.search.trim()
      : '';

  const where: Prisma.WarehouseWhereInput = {
    ...(isActive === undefined ? {} : { isActive }),
    ...(search
      ? {
          OR: [
            {
              code: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.warehouse.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.warehouse.count({
      where,
    }),
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

export const getWarehouseById = async (
  id: unknown,
): Promise<Warehouse> => {
  const warehouseId = normalizeRequiredString(
    id,
    'Warehouse id',
  );

  const warehouse = await prisma.warehouse.findUnique({
    where: {
      id: warehouseId,
    },
  });

  if (!warehouse) {
    throw new WarehouseServiceError(
      'Warehouse not found.',
      404,
    );
  }

  return warehouse;
};

export const updateWarehouse = async (
  id: unknown,
  input: WarehouseInput,
): Promise<Warehouse> => {
  const warehouseId = normalizeRequiredString(
    id,
    'Warehouse id',
  );

  try {
    return await prisma.warehouse.update({
      where: {
        id: warehouseId,
      },
      data: toUpdateData(input),
    });
  } catch (error) {
    return handlePrismaError(error);
  }
};
