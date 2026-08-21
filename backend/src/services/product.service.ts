import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MAXIMUM_PAGE_SIZE = 100;

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type ProductInput = {
  sku?: unknown;
  name?: unknown;
  description?: unknown;
  categoryId?: unknown;
  unitOfMeasure?: unknown;
  reorderLevel?: unknown;
  isActive?: unknown;
};

type ProductListQuery = {
  search?: unknown;
  categoryId?: unknown;
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
    throw new ProductServiceError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new ProductServiceError(`${fieldName} must be a string or null.`, 400);
  }

  return value.trim() || null;
};

const parseNonNegativeDecimal = (value: unknown, fieldName: string): Prisma.Decimal | null => {
  if (value === null) return null;
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ProductServiceError(`${fieldName} must be a number or null.`, 400);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new ProductServiceError(`${fieldName} must be a finite number.`, 400);
  }

  try {
    const decimal = new Prisma.Decimal(value);
    if (!decimal.isFinite() || decimal.isNegative()) {
      throw new ProductServiceError(`${fieldName} must be a non-negative number.`, 400);
    }
    return decimal;
  } catch (error) {
    if (error instanceof ProductServiceError) throw error;
    throw new ProductServiceError(`${fieldName} must be a valid number.`, 400);
  }
};

const parsePositiveInteger = (value: unknown, fallback: number, fieldName: string, maximum?: number): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ProductServiceError(`${fieldName} must be a positive integer.`, 400);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    const limit = maximum ? ` no greater than ${maximum}` : '';
    throw new ProductServiceError(`${fieldName} must be a positive integer${limit}.`, 400);
  }

  return parsed;
};

const parseIsActive = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ProductServiceError('isActive must be true or false.', 400);
};

const ensureKnownFields = (input: Record<string, unknown>): void => {
  const allowedFields = new Set(['sku', 'name', 'description', 'categoryId', 'unitOfMeasure', 'reorderLevel', 'isActive']);
  const unknownField = Object.keys(input).find((key) => !allowedFields.has(key));
  if (unknownField) throw new ProductServiceError(`Unsupported field: ${unknownField}.`, 400);
};

const ensureCategoryExists = async (categoryId: string): Promise<void> => {
  const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!category) throw new ProductServiceError('Category not found.', 404);
};

const toCreateData = (input: ProductInput): Prisma.ProductUncheckedCreateInput => {
  if (!isRecord(input)) throw new ProductServiceError('Request body must be a JSON object.', 400);
  ensureKnownFields(input);

  const data: Prisma.ProductUncheckedCreateInput = {
    sku: normalizeRequiredString(input.sku, 'SKU'),
    name: normalizeRequiredString(input.name, 'Name'),
    categoryId: normalizeRequiredString(input.categoryId, 'Category id'),
  };

  if (hasOwnProperty(input, 'description')) data.description = normalizeOptionalString(input.description, 'Description');
  if (hasOwnProperty(input, 'unitOfMeasure')) data.unitOfMeasure = normalizeRequiredString(input.unitOfMeasure, 'Unit of measure');
  if (hasOwnProperty(input, 'reorderLevel')) data.reorderLevel = parseNonNegativeDecimal(input.reorderLevel, 'Reorder level');
  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new ProductServiceError('isActive must be a boolean.', 400);
    data.isActive = input.isActive;
  }

  return data;
};

const toUpdateData = (input: ProductInput): Prisma.ProductUncheckedUpdateInput => {
  if (!isRecord(input)) throw new ProductServiceError('Request body must be a JSON object.', 400);
  ensureKnownFields(input);

  const data: Prisma.ProductUncheckedUpdateInput = {};
  if (hasOwnProperty(input, 'sku')) data.sku = normalizeRequiredString(input.sku, 'SKU');
  if (hasOwnProperty(input, 'name')) data.name = normalizeRequiredString(input.name, 'Name');
  if (hasOwnProperty(input, 'description')) data.description = normalizeOptionalString(input.description, 'Description');
  if (hasOwnProperty(input, 'categoryId')) data.categoryId = normalizeRequiredString(input.categoryId, 'Category id');
  if (hasOwnProperty(input, 'unitOfMeasure')) data.unitOfMeasure = normalizeRequiredString(input.unitOfMeasure, 'Unit of measure');
  if (hasOwnProperty(input, 'reorderLevel')) data.reorderLevel = parseNonNegativeDecimal(input.reorderLevel, 'Reorder level');
  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') throw new ProductServiceError('isActive must be a boolean.', 400);
    data.isActive = input.isActive;
  }
  if (Object.keys(data).length === 0) {
    throw new ProductServiceError('At least one product field must be provided.', 400);
  }

  return data;
};

const handlePrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new ProductServiceError('A product with this SKU already exists.', 409);
    if (error.code === 'P2025') throw new ProductServiceError('Product not found.', 404);
    if (error.code === 'P2003') throw new ProductServiceError('Category not found.', 404);
  }

  throw error;
};

const productInclude = { category: { select: { id: true, name: true } } } as const;

export const createProduct = async (input: ProductInput) => {
  const data = toCreateData(input);
  await ensureCategoryExists(data.categoryId);

  try {
    return await prisma.product.create({ data, include: productInclude });
  } catch (error) {
    return handlePrismaError(error);
  }
};

export const listProducts = async (query: ProductListQuery) => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const pageSize = parsePositiveInteger(query.pageSize, 20, 'pageSize', MAXIMUM_PAGE_SIZE);
  const isActive = parseIsActive(query.isActive);
  const categoryId = query.categoryId === undefined ? undefined : normalizeRequiredString(query.categoryId, 'categoryId');
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  if (query.search !== undefined && typeof query.search !== 'string') {
    throw new ProductServiceError('search must be a string.', 400);
  }

  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(isActive === undefined ? {} : { isActive }),
    ...(search
      ? {
          OR: [
            { sku: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
};

export const getProductById = async (id: unknown) => {
  const product = await prisma.product.findUnique({
    where: { id: normalizeRequiredString(id, 'Product id') },
    include: productInclude,
  });
  if (!product) throw new ProductServiceError('Product not found.', 404);
  return product;
};

export const updateProduct = async (id: unknown, input: ProductInput) => {
  const productId = normalizeRequiredString(id, 'Product id');
  const data = toUpdateData(input);
  if (typeof data.categoryId === 'string') await ensureCategoryExists(data.categoryId);

  try {
    return await prisma.product.update({ where: { id: productId }, data, include: productInclude });
  } catch (error) {
    return handlePrismaError(error);
  }
};
