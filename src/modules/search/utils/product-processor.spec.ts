import { ProductProcessor } from './product-processor.util';
import { mockProducts } from '../../../test/mocks/product.mock';

describe('ProductProcessor', () => {
  describe('extractUniqueProducts', () => {
    it('should extract and deduplicate products from search hits', () => {
      // Preparar dados de mockup baseados nos mockProducts existentes
      const searchHits = [
        {
          _source: {
            items: [
              {
                productId: mockProducts[0].uuid,
                productName: mockProducts[0].name,
                price: mockProducts[0].price,
                description: mockProducts[0].description,
              },
              {
                productId: mockProducts[1].uuid,
                productName: mockProducts[1].name,
                price: mockProducts[1].price,
                description: mockProducts[1].description,
              },
            ],
          },
        },
        {
          _source: {
            items: [
              {
                productId: mockProducts[0].uuid, // Duplicado
                productName: mockProducts[0].name,
                price: mockProducts[0].price,
                description: mockProducts[0].description,
              },
              {
                productId: mockProducts[2].uuid,
                productName: mockProducts[2].name,
                price: mockProducts[2].price,
                description: mockProducts[2].description,
              },
            ],
          },
        },
      ];

      // Remova o segundo argumento (searchTerms)
      const result = ProductProcessor.extractUniqueProducts(searchHits);

      // Verificar se há 3 produtos únicos
      expect(result).toHaveLength(3);

      // Verificar se não há duplicatas
      const productIds = result.map((p) => p.productId);
      expect(new Set(productIds).size).toBe(productIds.length);
    });
  });

  describe('paginateProducts', () => {
    it('should return correct page of products', () => {
      const products = [
        { productId: 'p1', productName: 'Product 1' },
        { productId: 'p2', productName: 'Product 2' },
        { productId: 'p3', productName: 'Product 3' },
        { productId: 'p4', productName: 'Product 4' },
        { productId: 'p5', productName: 'Product 5' },
      ];

      const page1 = ProductProcessor.paginateProducts(products, 1, 2);
      const page2 = ProductProcessor.paginateProducts(products, 2, 2);
      const page3 = ProductProcessor.paginateProducts(products, 3, 2);

      expect(page1).toHaveLength(2);
      expect(page1[0].productId).toBe('p1');
      expect(page1[1].productId).toBe('p2');

      expect(page2).toHaveLength(2);
      expect(page2[0].productId).toBe('p3');
      expect(page2[1].productId).toBe('p4');

      expect(page3).toHaveLength(1);
      expect(page3[0].productId).toBe('p5');
    });

    it('should return empty array for out of bounds page', () => {
      const products = [{ productId: 'p1' }, { productId: 'p2' }];

      const result = ProductProcessor.paginateProducts(products, 3, 2);

      expect(result).toHaveLength(0);
    });
  });
});
