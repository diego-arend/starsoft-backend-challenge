import {
  WriteResponseBase,
  SearchResponseBody,
} from '@elastic/elasticsearch/lib/api/types';

export interface ElasticsearchProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  createdAt: string;
}

export const mockProducts: ElasticsearchProduct[] = [
  {
    id: 'prod-001',
    name: 'Smartphone XYZ',
    description: 'High-end smartphone with amazing features',
    price: 999.99,
    category: 'electronics',
    createdAt: '2023-01-15T10:00:00Z',
  },
  {
    id: 'prod-002',
    name: 'Laptop Pro',
    description: 'Powerful laptop for professionals',
    price: 1299.99,
    category: 'electronics',
    createdAt: '2023-02-20T11:30:00Z',
  },
  {
    id: 'prod-003',
    name: 'Wireless Headphones',
    description: 'Noise-cancelling wireless headphones',
    price: 149.99,
    category: 'accessories',
    createdAt: '2023-03-05T09:15:00Z',
  },
];

export const mockSearchResponses = {
  basicSearch: {
    hits: {
      total: {
        value: 2,
        relation: 'eq',
      },
      hits: [
        {
          _index: 'products',
          _id: mockProducts[0].id,
          _score: 1.0,
          _source: mockProducts[0],
        },
        {
          _index: 'products',
          _id: mockProducts[1].id,
          _score: 0.8,
          _source: mockProducts[1],
        },
      ],
    },
  } as unknown as SearchResponseBody,

  filterSearch: {
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      hits: [
        {
          _index: 'products',
          _id: mockProducts[0].id,
          _score: 1.0,
          _source: mockProducts[0],
        },
      ],
    },
  } as unknown as SearchResponseBody,

  emptySearch: {
    hits: {
      total: {
        value: 0,
        relation: 'eq',
      },
      hits: [],
    },
  } as unknown as SearchResponseBody,
};

export const mockResponses = {
  index: {
    _index: 'products',
    _id: mockProducts[0].id,
    _version: 1,
    result: 'created',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
  } as unknown as WriteResponseBase,

  update: {
    _index: 'products',
    _id: mockProducts[0].id,
    _version: 2,
    result: 'updated',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
  } as unknown as WriteResponseBase,

  delete: {
    _index: 'products',
    _id: mockProducts[0].id,
    _version: 3,
    result: 'deleted',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
  } as unknown as WriteResponseBase,

  bulk: {
    took: 30,
    errors: false,
    items: [
      {
        index: {
          _index: 'products',
          _id: mockProducts[0].id,
          _version: 1,
          result: 'created',
          status: 201,
        },
      },
      {
        index: {
          _index: 'products',
          _id: mockProducts[1].id,
          _version: 1,
          result: 'created',
          status: 201,
        },
      },
    ],
  },
};
