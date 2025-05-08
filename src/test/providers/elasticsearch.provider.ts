import { ElasticsearchService } from '@nestjs/elasticsearch';
import { mockOrders } from '../mocks/order.mock';

export class ElasticsearchServiceMock {
  // Mock para respostas do Elasticsearch compatível com a versão 7+
  search = jest.fn().mockImplementation((searchRequest) => {
    // Referência para as ordens mockadas
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

export const elasticsearchProviders = [
  {
    provide: ElasticsearchService,
    useClass: ElasticsearchServiceMock,
  },
];
