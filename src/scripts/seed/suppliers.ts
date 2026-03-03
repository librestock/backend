import { faker } from '@faker-js/faker';
import { type Product } from '../../routes/products/entities/product.entity';
import { Supplier } from '../../routes/suppliers/entities/supplier.entity';
import { SupplierProduct } from '../../routes/suppliers/entities/supplier-product.entity';
import { SEED_CONFIG } from './config';
import { buildSupplier, buildSupplierProduct } from './factories';
import { registry } from './registry';

registry.register({
  name: 'suppliers',
  dependencies: [],
  async run(ctx) {
    console.log('Seeding suppliers...');

    const supplierRepo = ctx.dataSource.getRepository(Supplier);
    const suppliers: Supplier[] = [];

    for (let i = 0; i < SEED_CONFIG.suppliers; i++) {
      const entity = supplierRepo.create(buildSupplier());
      const saved = await supplierRepo.save(entity);
      suppliers.push(saved);
    }

    console.log(`  Created ${suppliers.length} suppliers\n`);
    ctx.store.set('suppliers', suppliers);
  },
});

registry.register({
  name: 'supplier-products',
  dependencies: ['suppliers', 'products'],
  async run(ctx) {
    console.log('Seeding supplier-product links...');

    const suppliers = ctx.store.get('suppliers') as Supplier[];
    const products = ctx.store.get('products') as Product[];

    const spRepo = ctx.dataSource.getRepository(SupplierProduct);
    const supplierProducts: SupplierProduct[] = [];
    const usedPairs = new Set<string>();

    for (let i = 0; i < SEED_CONFIG.supplierProducts; i++) {
      const supplier = faker.helpers.arrayElement(suppliers);
      const product = faker.helpers.arrayElement(products);
      const pairKey = `${supplier.id}:${product.id}`;

      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const attrs = buildSupplierProduct(supplier.id, product.id, supplier.name, {
        is_preferred: i < suppliers.length,
      });
      const entity = spRepo.create(attrs);
      const saved = await spRepo.save(entity);
      supplierProducts.push(saved);
    }

    console.log(`  Created ${supplierProducts.length} supplier-product links\n`);
    ctx.store.set('supplier-products', supplierProducts);
  },
});
