import { faker } from '@faker-js/faker';
import { type Category } from '../../effect/modules/categories/entities/category.entity';
import { Product } from '../../effect/modules/products/entities/product.entity';
import { type Supplier } from '../../effect/modules/suppliers/entities/supplier.entity';
import { SEED_CONFIG } from './config';
import { buildProduct } from './factories';
import { registry } from './registry';

registry.register({
  name: 'products',
  dependencies: ['categories', 'suppliers'],
  async run(ctx) {
    console.log('Seeding products...');

    const categories = ctx.store.get('categories') as Category[];
    const suppliers = ctx.store.get('suppliers') as Supplier[];

    const productRepo = ctx.dataSource.getRepository(Product);
    const products: Product[] = [];
    const leafCategories = categories.filter((cat) => cat.parent_id !== null);

    for (let i = 0; i < SEED_CONFIG.products; i++) {
      const category = faker.helpers.arrayElement(leafCategories);
      const supplier = faker.helpers.arrayElement(suppliers);

      const attrs = buildProduct(category.id, supplier.id);
      const saved = await productRepo.save(productRepo.create(attrs));
      products.push(saved);

      if ((i + 1) % 25 === 0) {
        console.log(`  ${i + 1}/${SEED_CONFIG.products} products...`);
      }
    }

    console.log(`  Created ${products.length} products\n`);
    ctx.store.set('products', products);
  },
});
