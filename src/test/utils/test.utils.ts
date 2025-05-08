import { DeepPartial } from 'typeorm';

/**
 * Helper para criar objetos de teste com valores padrão substituíveis
 */
export const createTestObject = <T>(
  defaults: T,
  overrides?: DeepPartial<T>,
): T => {
  return { ...defaults, ...(overrides || {}) } as T;
};

/**
 * Helper para simular a atualização de um objeto
 */
export const updateObject = <T>(original: T, updates?: DeepPartial<T>): T => {
  return { ...original, ...(updates || {}) } as T;
};

/**
 * Helper para criar paginação de teste
 */
export const createTestPagination = <T>(
  items: T[],
  total: number,
  page = 1,
  limit = 10,
) => {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
