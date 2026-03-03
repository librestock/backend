import { faker } from '@faker-js/faker';
import { LocationType } from '@librestock/types';
import { type Area } from '../../routes/areas/entities/area.entity';
import { Inventory } from '../../routes/inventory/entities/inventory.entity';
import { type Location } from '../../routes/locations/entities/location.entity';
import { type Product } from '../../routes/products/entities/product.entity';
import { SEED_CONFIG } from './config';
import { buildInventory } from './factories';
import { registry } from './registry';

registry.register({
  name: 'inventory',
  dependencies: ['products', 'locations', 'areas'],
  async run(ctx) {
    console.log('Seeding inventory...');

    const products = ctx.store.get('products') as Product[];
    const locations = ctx.store.get('locations') as Location[];
    const areas = ctx.store.get('areas') as Area[];

    const inventoryRepo = ctx.dataSource.getRepository(Inventory);
    const inventoryRecords: Inventory[] = [];

    const warehouseLocations = locations.filter(
      (l) => l.type === LocationType.WAREHOUSE || l.type === LocationType.SUPPLIER,
    );

    for (let i = 0; i < SEED_CONFIG.inventoryRecords; i++) {
      const product = faker.helpers.arrayElement(products);
      const location = faker.helpers.arrayElement(warehouseLocations);

      const locationAreas = areas.filter((a) => a.location_id === location.id);
      const area =
        locationAreas.length > 0
          ? faker.helpers.maybe(() => faker.helpers.arrayElement(locationAreas), { probability: 0.6 })
          : null;

      const attrs = buildInventory(product.id, location.id, {
        areaId: area?.id,
        isPerishable: product.is_perishable,
        standardCost: product.standard_cost,
      });
      const saved = await inventoryRepo.save(inventoryRepo.create(attrs));
      inventoryRecords.push(saved);

      if ((i + 1) % 50 === 0) {
        console.log(`  ${i + 1}/${SEED_CONFIG.inventoryRecords} inventory records...`);
      }
    }

    console.log(`  Created ${inventoryRecords.length} inventory records\n`);
    ctx.store.set('inventory', inventoryRecords);
  },
});
