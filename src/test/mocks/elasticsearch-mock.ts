import { OrderStatus } from '../../modules/order/entities/order.entity';

// Criar os mocks diretamente aqui em vez de importar
const mockOrders = [
  {
    id: 1,
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.DELIVERED,
    total: 2500,
    createdAt: '2023-01-15T14:30:00Z',
    updatedAt: '2023-01-16T09:45:00Z',
    items: [
      {
        id: 101,
        productId: '550e8400-e29b-41d4-a716-446655440001',
        productName: 'Smartphone Galaxy S22',
        price: 1250,
        quantity: 2,
      },
    ],
  },
  {
    id: 2,
    uuid: '223e4567-e89b-12d3-a456-426614174001',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.PROCESSING,
    total: 1800,
    createdAt: '2023-02-20T10:15:00Z',
    updatedAt: '2023-02-20T10:30:00Z',
    items: [
      {
        id: 201,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        productName: 'Laptop Ultrabook Pro',
        price: 1800,
        quantity: 1,
      },
    ],
  },
  {
    id: 3,
    uuid: '323e4567-e89b-12d3-a456-426614174002',
    customerId: '650e8400-e29b-41d4-a716-446655440003',
    status: OrderStatus.PENDING,
    total: 350,
    createdAt: '2023-03-10T16:45:00Z',
    updatedAt: '2023-03-10T16:45:00Z',
    items: [
      {
        id: 301,
        productId: '550e8400-e29b-41d4-a716-446655440003',
        productName: 'Wireless Headphones',
        price: 175,
        quantity: 2,
      },
    ],
  },
];

export class ElasticsearchServiceMock {
  // Mock para respostas do Elasticsearch compatível com a versão 7+
  search = jest.fn().mockImplementation((searchRequest) => {
    // Referência para as ordens mockadas localmente
    const orders = mockOrders;

    // Filtrar resultados baseado na query
    let filteredOrders = [...orders];

    // Se houver uma query com term, filtramos baseado nela
    if (searchRequest.query?.term) {
      const field = Object.keys(searchRequest.query.term)[0];
      const value = searchRequest.query.term[field];

      filteredOrders = filteredOrders.filter(
        (order) => order[field] && order[field].toString() === value.toString(),
      );
    }

    // Se houver uma query nested, filtramos para produtos
    if (searchRequest.query?.nested) {
      const path = searchRequest.query.nested.path;

      if (path === 'items') {
        if (searchRequest.query.nested.query?.term) {
          const field = Object.keys(searchRequest.query.nested.query.term)[0];
          const value = searchRequest.query.nested.query.term[field];
          const itemField = field.split('.')[1]; // Ex: 'items.productId' => 'productId'

          filteredOrders = filteredOrders.filter((order) =>
            order.items.some(
              (item) =>
                item[itemField] &&
                item[itemField].toString() === value.toString(),
            ),
          );
        }

        if (searchRequest.query.nested.query?.match) {
          const field = Object.keys(searchRequest.query.nested.query.match)[0];
          const value = searchRequest.query.nested.query.match[field];
          const itemField = field.split('.')[1]; // Ex: 'items.productName' => 'productName'

          filteredOrders = filteredOrders.filter((order) =>
            order.items.some(
              (item) =>
                item[itemField] &&
                item[itemField].toString().includes(value.toString()),
            ),
          );
        }
      }
    }

    // Se houver query de range para datas
    if (searchRequest.query?.range?.createdAt) {
      const range = searchRequest.query.range.createdAt;

      if (range.gte) {
        const fromDate = new Date(range.gte);
        filteredOrders = filteredOrders.filter(
          (order) => new Date(order.createdAt) >= fromDate,
        );
      }

      if (range.lte) {
        const toDate = new Date(range.lte);
        filteredOrders = filteredOrders.filter(
          (order) => new Date(order.createdAt) <= toDate,
        );
      }
    }

    // Aplicar paginação
    const { from = 0, size = 10 } = searchRequest;
    const paginatedOrders = filteredOrders.slice(from, from + size);

    // Retornar no formato esperado pelo Elasticsearch 7+
    return {
      hits: {
        hits: paginatedOrders.map((order) => ({
          _source: order,
          _id: order.id.toString(),
          _index: 'orders',
        })),
        total: {
          value: filteredOrders.length,
          relation: 'eq',
        },
      },
    };
  });

  // Outros métodos que podem ser necessários
  indices = {
    exists: jest.fn().mockReturnValue(Promise.resolve(true)),
    create: jest.fn().mockReturnValue(Promise.resolve({})),
  };

  index = jest.fn().mockImplementation((params) => {
    return Promise.resolve({
      _index: params.index,
      _id: '123',
      _version: 1,
      result: 'created',
    });
  });

  update = jest.fn().mockReturnValue(Promise.resolve({}));
  delete = jest.fn().mockReturnValue(Promise.resolve({}));
}

// Exportar os mocks para uso em testes
export { mockOrders };
