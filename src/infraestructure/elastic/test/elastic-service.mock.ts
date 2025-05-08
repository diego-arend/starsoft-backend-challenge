import {
  ClusterHealthResponse,
  WriteResponseBase,
  UpdateResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchProduct } from '../elastic.types';

export const mockEntities = [
  {
    id: '001',
    name: 'Product Test 1',
    description: 'Test description 1',
    price: 150.99,
    category: 'electronics',
    createdAt: '2023-01-10T10:00:00Z',
    status: 'completed',
  },
  {
    id: '002',
    name: 'Product Test 2',
    description: 'Test description 2',
    price: 99.99,
    category: 'accessories',
    createdAt: '2023-01-15T14:00:00Z',
    status: 'pending',
  },
];

export const mockHealthResponse: ClusterHealthResponse = {
  cluster_name: 'test-cluster',
  status: 'green',
  timed_out: false,
  number_of_nodes: 1,
  number_of_data_nodes: 1,
  active_primary_shards: 5,
  active_shards: 5,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
  delayed_unassigned_shards: 0,
  number_of_pending_tasks: 0,
  number_of_in_flight_fetch: 0,
  task_max_waiting_in_queue_millis: 0,
  active_shards_percent_as_number: 100,
  unassigned_primary_shards: 0,
};

export const mockResults = {
  indexDocument: {
    _index: 'test-index',
    _id: '001',
    _version: 1,
    result: 'created',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 0,
    _primary_term: 1,
  } as WriteResponseBase,

  searchResults: [
    {
      id: '001',
      name: 'Product Test 1',
      description: 'Test description 1',
      price: 150.99,
      category: 'electronics',
      createdAt: '2023-01-10T10:00:00Z',
    },
    {
      id: '002',
      name: 'Product Test 2',
      description: 'Test description 2',
      price: 99.99,
      category: 'accessories',
      createdAt: '2023-01-15T14:00:00Z',
    },
  ] as ElasticsearchProduct[],

  updateResult: {
    _index: 'test-index',
    _id: '001',
    _version: 2,
    result: 'updated',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 1,
    _primary_term: 1,
  } as UpdateResponse<unknown>,

  deleteResult: {
    _index: 'test-index',
    _id: '001',
    _version: 3,
    result: 'deleted',
    _shards: {
      total: 2,
      successful: 1,
      failed: 0,
    },
    _seq_no: 2,
    _primary_term: 1,
  } as WriteResponseBase,
};
