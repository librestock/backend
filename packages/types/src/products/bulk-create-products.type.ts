import type { CreateProductDto } from './create-product.type'

export interface BulkCreateProductsDto {
  products: CreateProductDto[]
}
