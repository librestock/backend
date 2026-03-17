import { faker } from '@faker-js/faker';
import { Category } from '../../effect/modules/categories/entities/category.entity';
import { SEED_CONFIG, YACHT_CATEGORIES } from './config';
import { registry } from './registry';

registry.register({
  name: 'categories',
  dependencies: [],
  async run(ctx) {
    console.log('Seeding categories...');

    const categoryRepo = ctx.dataSource.getRepository(Category);
    const categories: Category[] = [];

    const rootCategories = YACHT_CATEGORIES.root.slice(0, SEED_CONFIG.categories.root);

    for (const categoryName of rootCategories) {
      const category = categoryRepo.create({
        name: categoryName,
        description: faker.commerce.productDescription(),
        parent_id: null,
      });
      const saved = await categoryRepo.save(category);
      categories.push(saved);

      const childNames =
        YACHT_CATEGORIES.children[categoryName as keyof typeof YACHT_CATEGORIES.children] ||
        Array(SEED_CONFIG.categories.children).fill(null).map(() => faker.commerce.department());

      for (const childName of childNames.slice(0, SEED_CONFIG.categories.children)) {
        const child = categoryRepo.create({
          name: childName,
          description: faker.commerce.productDescription(),
          parent_id: saved.id,
        });
        const savedChild = await categoryRepo.save(child);
        categories.push(savedChild);
      }
    }

    console.log(
      `  Created ${categories.length} categories (${rootCategories.length} root + ${categories.length - rootCategories.length} children)\n`,
    );

    ctx.store.set('categories', categories);
  },
});
