import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { SearchResult } from '../interfaces/search-result.interface';
import {
  SearchServiceUnavailableException,
  SearchExecutionException,
} from '../exceptions/search-exceptions';
import {
  extractOrdersFromResponse,
  extractTotalFromResponse,
} from './elasticsearch.helpers';

/**
 * Execute search with error handling and response processing
 *
 * @param elasticsearchService - The ElasticsearchService instance
 * @param searchRequest - The search request to execute
 * @param page - The current page number (for pagination)
 * @param limit - The number of results per page
 * @returns The search result with processed items and pagination information
 * @throws SearchServiceUnavailableException if Elasticsearch is unavailable
 * @throws SearchExecutionException for other search errors
 */
export async function executeSearch(
  elasticsearchService: ElasticsearchService,
  searchRequest: SearchRequest,
  page = 1,
  limit = 10,
): Promise<SearchResult> {
  try {
    const searchResponse = await elasticsearchService.search(searchRequest);

    const items = extractOrdersFromResponse(searchResponse);
    const total = extractTotalFromResponse(searchResponse);
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    if (error.meta?.statusCode === 503 || error.name === 'ConnectionError') {
      throw new SearchServiceUnavailableException(error.message);
    } else {
      throw new SearchExecutionException(error.message);
    }
  }
}
