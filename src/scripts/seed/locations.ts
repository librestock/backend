import { faker } from '@faker-js/faker';
import { LocationType } from '@librestock/types/locations';
import { Area } from '../../routes/areas/entities/area.entity';
import { Location } from '../../routes/locations/entities/location.entity';
import { AREA_TEMPLATES, LOCATION_NAMES, SEED_CONFIG, SUB_AREA_TEMPLATES } from './config';
import { buildLocation } from './factories';
import { registry } from './registry';

registry.register({
  name: 'locations',
  dependencies: [],
  async run(ctx) {
    console.log('Seeding locations...');

    const locationRepo = ctx.dataSource.getRepository(Location);
    const locations: Location[] = [];

    for (const loc of LOCATION_NAMES.slice(0, SEED_CONFIG.locations)) {
      const saved = await locationRepo.save(locationRepo.create(buildLocation(loc.name, loc.type)));
      locations.push(saved);
    }

    console.log(`  Created ${locations.length} locations\n`);
    ctx.store.set('locations', locations);
  },
});

registry.register({
  name: 'areas',
  dependencies: ['locations'],
  async run(ctx) {
    console.log('Seeding areas...');

    const locations = ctx.store.get('locations') as Location[];

    const areaRepo = ctx.dataSource.getRepository(Area);
    const areas: Area[] = [];

    const warehouseLocations = locations.filter((l) => l.type === LocationType.WAREHOUSE);

    for (const location of warehouseLocations) {
      const templateKey = location.name.toLowerCase().includes('cold')
        ? 'cold_storage'
        : location.name.toLowerCase().includes('workshop') ||
            location.name.toLowerCase().includes('electronics')
          ? 'workshop'
          : 'warehouse';

      const areaNames = (AREA_TEMPLATES[templateKey] ?? AREA_TEMPLATES.warehouse ?? [])
        .slice(0, SEED_CONFIG.areasPerLocation);

      let areaCode = 1;

      for (const areaName of areaNames) {
        const area = areaRepo.create({
          location_id: location.id,
          parent_id: null,
          name: areaName,
          code: `${location.name.charAt(0).toUpperCase()}${areaCode}`,
          description: `${areaName} in ${location.name}`,
          is_active: true,
        });
        const savedArea = await areaRepo.save(area);
        areas.push(savedArea);
        areaCode++;

        const subAreaCount = faker.number.int({ min: 0, max: SEED_CONFIG.subAreasPerArea });
        for (let j = 0; j < subAreaCount; j++) {
          const subArea = areaRepo.create({
            location_id: location.id,
            parent_id: savedArea.id,
            name: SUB_AREA_TEMPLATES[j % SUB_AREA_TEMPLATES.length],
            code: `${savedArea.code}-${j + 1}`,
            description: '',
            is_active: true,
          });
          const savedSub = await areaRepo.save(subArea);
          areas.push(savedSub);
        }
      }
    }

    console.log(`  Created ${areas.length} areas\n`);
    ctx.store.set('areas', areas);
  },
});
