import { Order } from '../entities/order.entity';
import { OrderResponseDto } from '../dto/order-response.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

/**
 * Transforms an Order entity to an OrderResponseDto
 * Removes internal IDs and circular references before returning the DTO
 *
 * @param order - Order entity to transform
 * @returns Formatted OrderResponseDto for API responses
 */
export function transformOrderToDto(order: Order): OrderResponseDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...orderData } = order;

  const items = order.items?.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, order: orderRef, ...itemData } = item;
    return itemData;
  });

  return new OrderResponseDto({
    ...orderData,
    items,
  });
}

/**
 * Transforms a paginated result containing Order entities to a paginated result with DTOs
 * Preserves pagination metadata while converting each Order to OrderResponseDto
 *
 * @param paginatedResult - Paginated result with Order entities
 * @returns Paginated result with OrderResponseDto objects
 */
export function transformPaginatedOrdersToDto(
  paginatedResult: PaginatedResult<Order>,
): PaginatedResult<OrderResponseDto> {
  return {
    ...paginatedResult,
    data: paginatedResult.data.map(transformOrderToDto),
  };
}
