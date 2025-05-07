export interface ElasticsearchProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
}
