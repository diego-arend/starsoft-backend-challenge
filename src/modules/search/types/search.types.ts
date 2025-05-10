/**
 * Interface for Order with items field
 */
export interface OrderWithItems {
  items?: {
    productId: string;
    productName: string;
    description?: string;
    price?: number;
    quantity?: number;
    imageUrl?: string;
  }[];
  [key: string]: any;
}

/**
 * Date range parameters
 */
export interface DateRangeParams {
  from?: string;
  to?: string;
}
