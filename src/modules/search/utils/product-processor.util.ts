import { OrderWithItems } from '../types/search.types';

/**
 * Utility class for processing product data from orders
 */
export class ProductProcessor {
  /**
   * Extracts unique products from order search results
   * @param searchHits Elasticsearch search hits
   * @param searchTerms Search terms for filtering
   * @returns Array of unique products
   */
  static extractUniqueProducts(searchHits: any[]): any[] {
    // Extract all products from all orders
    let allProducts = [];
    searchHits.forEach((hit) => {
      const order = hit._source as OrderWithItems;
      if (order.items && Array.isArray(order.items)) {
        allProducts = [...allProducts, ...order.items];
      }
    });

    // Deduplicate products by productId
    const productMap = new Map();
    allProducts.forEach((product) => {
      if (!productMap.has(product.productId)) {
        productMap.set(product.productId, product);
      }
    });

    return Array.from(productMap.values());
  }

  /**
   * Gets paginated products from the full list
   * @param products Full list of products
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated products
   */
  static paginateProducts(products: any[], page: number, limit: number): any[] {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return products.slice(startIndex, endIndex);
  }
}
