import { Prisma, PrismaClient, type Customer } from '@prisma/client';

const prisma = new PrismaClient();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAXIMUM_PAGE_SIZE = 100;

export class CustomerServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

type CustomerInput = {
  customerCode?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  billingAddress?: unknown;
  shippingAddress?: unknown;
  isActive?: unknown;
};

type CustomerListQuery = {
  search?: unknown;
  isActive?: unknown;
  page?: unknown;
  pageSize?: unknown;
};

type CustomerUpdateData = Prisma.CustomerUpdateInput;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CustomerServiceError(`${fieldName} is required.`, 400);
  }

  return value.trim();
};

const normalizeCustomerId = (value: unknown): string =>
  normalizeRequiredString(value, 'Customer id');

const normalizeOptionalString = (value: unknown, fieldName: string): string | null => {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new CustomerServiceError(`${fieldName} must be a string or null.`, 400);
  }

  return value.trim() || null;
};

const normalizeEmail = (value: unknown): string | null => {
  const email = normalizeOptionalString(value, 'Email');

  if (email && !EMAIL_PATTERN.test(email)) {
    throw new CustomerServiceError('Email must be valid.', 400);
  }

  return email?.toLowerCase() ?? null;
};

const parsePositiveInteger = (value: unknown, fallback: number, fieldName: string, maximum?: number): number => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new CustomerServiceError(`${fieldName} must be a positive integer.`, 400);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    const limit = maximum ? ` no greater than ${maximum}` : '';
    throw new CustomerServiceError(`${fieldName} must be a positive integer${limit}.`, 400);
  }

  return parsed;
};

const parseIsActive = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new CustomerServiceError('isActive must be true or false.', 400);
};

const hasOwnProperty = (value: Record<string, unknown>, property: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, property);

const ensureKnownFields = (input: Record<string, unknown>): void => {
  const allowedFields = new Set([
    'customerCode',
    'name',
    'email',
    'phone',
    'billingAddress',
    'shippingAddress',
    'isActive',
  ]);

  const unknownField = Object.keys(input).find((key) => !allowedFields.has(key));
  if (unknownField) {
    throw new CustomerServiceError(`Unsupported field: ${unknownField}.`, 400);
  }
};

const toCreateData = (input: CustomerInput): Prisma.CustomerCreateInput => {
  if (!isRecord(input)) {
    throw new CustomerServiceError('Request body must be a JSON object.', 400);
  }

  ensureKnownFields(input);

  const data: Prisma.CustomerCreateInput = {
    customerCode: normalizeRequiredString(input.customerCode, 'Customer code'),
    name: normalizeRequiredString(input.name, 'Name'),
  };

  if (hasOwnProperty(input, 'email')) data.email = normalizeEmail(input.email);
  if (hasOwnProperty(input, 'phone')) data.phone = normalizeOptionalString(input.phone, 'Phone');
  if (hasOwnProperty(input, 'billingAddress')) data.billingAddress = normalizeOptionalString(input.billingAddress, 'Billing address');
  if (hasOwnProperty(input, 'shippingAddress')) data.shippingAddress = normalizeOptionalString(input.shippingAddress, 'Shipping address');
  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') {
      throw new CustomerServiceError('isActive must be a boolean.', 400);
    }
    data.isActive = input.isActive;
  }

  return data;
};

const toUpdateData = (input: CustomerInput): CustomerUpdateData => {
  if (!isRecord(input)) {
    throw new CustomerServiceError('Request body must be a JSON object.', 400);
  }

  ensureKnownFields(input);

  const data: CustomerUpdateData = {};
  if (hasOwnProperty(input, 'customerCode')) data.customerCode = normalizeRequiredString(input.customerCode, 'Customer code');
  if (hasOwnProperty(input, 'name')) data.name = normalizeRequiredString(input.name, 'Name');
  if (hasOwnProperty(input, 'email')) data.email = normalizeEmail(input.email);
  if (hasOwnProperty(input, 'phone')) data.phone = normalizeOptionalString(input.phone, 'Phone');
  if (hasOwnProperty(input, 'billingAddress')) data.billingAddress = normalizeOptionalString(input.billingAddress, 'Billing address');
  if (hasOwnProperty(input, 'shippingAddress')) data.shippingAddress = normalizeOptionalString(input.shippingAddress, 'Shipping address');
  if (hasOwnProperty(input, 'isActive')) {
    if (typeof input.isActive !== 'boolean') {
      throw new CustomerServiceError('isActive must be a boolean.', 400);
    }
    data.isActive = input.isActive;
  }

  if (Object.keys(data).length === 0) {
    throw new CustomerServiceError('At least one customer field must be provided.', 400);
  }

  return data;
};

const handlePrismaError = (error: unknown): never => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new CustomerServiceError('A customer with this customer code already exists.', 409);
    }
    if (error.code === 'P2025') {
      throw new CustomerServiceError('Customer not found.', 404);
    }
    if (error.code === 'P2003') {
      throw new CustomerServiceError('Customer cannot be deleted because it is referenced by existing records.', 409);
    }
  }

  throw error;
};

export const createCustomer = async (input: CustomerInput): Promise<Customer> => {
  try {
    return await prisma.customer.create({ data: toCreateData(input) });
  } catch (error) {
    return handlePrismaError(error);
  }
};

export const listCustomers = async (query: CustomerListQuery): Promise<{
  data: Customer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> => {
  const page = parsePositiveInteger(query.page, 1, 'page');
  const pageSize = parsePositiveInteger(query.pageSize, 20, 'pageSize', MAXIMUM_PAGE_SIZE);
  const isActive = parseIsActive(query.isActive);
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  if (query.search !== undefined && typeof query.search !== 'string') {
    throw new CustomerServiceError('search must be a string.', 400);
  }

  const where: Prisma.CustomerWhereInput = {
    ...(isActive === undefined ? {} : { isActive }),
    ...(search
      ? {
          OR: [
            { customerCode: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
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

export const getCustomerById = async (id: unknown): Promise<Customer> => {
  const customer = await prisma.customer.findUnique({ where: { id: normalizeCustomerId(id) } });

  if (!customer) {
    throw new CustomerServiceError('Customer not found.', 404);
  }

  return customer;
};

export const updateCustomer = async (id: unknown, input: CustomerInput): Promise<Customer> => {
  try {
    return await prisma.customer.update({
      where: { id: normalizeCustomerId(id) },
      data: toUpdateData(input),
    });
  } catch (error) {
    return handlePrismaError(error);
  }
};

export const deleteCustomer = async (id: unknown): Promise<void> => {
  try {
    await prisma.customer.delete({ where: { id: normalizeCustomerId(id) } });
  } catch (error) {
    handlePrismaError(error);
  }
};
