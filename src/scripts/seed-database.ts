import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { config } from 'dotenv';
import { Category } from '../routes/categories/entities/category.entity';
import { Supplier } from '../routes/suppliers/entities/supplier.entity';
import { Product } from '../routes/products/entities/product.entity';

config();

// Mock user ID for audit fields
const MOCK_USER_ID = 'user_mock_seed_12345';

// Configuration for seeding
const SEED_CONFIG = {
  categories: {
    root: 10, // Number of root categories
    children: 3, // Number of child categories per root
  },
  suppliers: 20,
  products: 100,
};

// Yacht provisioning category names
const YACHT_CATEGORIES = {
  root: [
    'Galley & Provisions',
    'Deck & Exterior',
    'Electronics & Navigation',
    'Safety Equipment',
    'Engine Room',
    'Interior & Accommodation',
    'Water Sports',
    'Cleaning & Maintenance',
    'Medical Supplies',
    'Office & Administration',
  ],
  children: {
    'Galley & Provisions': [
      'Beverages',
      'Dry Goods',
      'Fresh Produce',
      'Frozen Foods',
      'Cookware',
      'Tableware',
    ],
    'Deck & Exterior': [
      'Ropes & Lines',
      'Fenders',
      'Anchoring',
      'Deck Hardware',
      'Lighting',
    ],
    'Electronics & Navigation': [
      'GPS & Chartplotters',
      'Communication',
      'Entertainment',
      'Instruments',
    ],
    'Safety Equipment': [
      'Life Jackets',
      'Fire Safety',
      'First Aid',
      'Emergency Signals',
    ],
    'Engine Room': [
      'Fuel Systems',
      'Lubricants',
      'Filters',
      'Tools',
      'Spare Parts',
    ],
    'Interior & Accommodation': [
      'Linens & Bedding',
      'Furniture',
      'Lighting',
      'Decor',
    ],
    'Water Sports': [
      'Diving Equipment',
      'Snorkeling',
      'Toys & Inflatables',
      'Fishing Gear',
    ],
    'Cleaning & Maintenance': [
      'Cleaning Supplies',
      'Polishes & Waxes',
      'Paints & Coatings',
      'Hand Tools',
    ],
    'Medical Supplies': ['Medications', 'First Aid', 'Personal Care'],
    'Office & Administration': ['Stationery', 'Documentation', 'Storage'],
  },
};

async function createDataSource(): Promise<DataSource> {
  // Use DATABASE_URL if available, otherwise use individual env vars
  const dataSourceConfig: any = {
    type: 'postgres',
    entities: [Category, Supplier, Product],
    synchronize: false,
  };

  if (process.env.DATABASE_URL) {
    dataSourceConfig.url = process.env.DATABASE_URL;
  } else {
    dataSourceConfig.host = process.env.PGHOST ?? 'localhost';
    dataSourceConfig.port = Number.parseInt(process.env.PGPORT ?? '5432');
    dataSourceConfig.username = process.env.PGUSER;
    dataSourceConfig.password = process.env.PGPASSWORD;
    dataSourceConfig.database = process.env.PGDATABASE ?? 'librestock_inventory';
  }

  const dataSource = new DataSource(dataSourceConfig);
  await dataSource.initialize();
  return dataSource;
}

async function clearDatabase(dataSource: DataSource) {
  console.log('🗑️  Clearing existing data...');

  // Delete in order of dependencies
  await dataSource.query('DELETE FROM products');
  await dataSource.query('DELETE FROM suppliers');
  await dataSource.query('DELETE FROM categories');

  console.log('✅ Database cleared\n');
}

async function seedCategories(dataSource: DataSource): Promise<Category[]> {
  console.log('📁 Seeding categories...');

  const categoryRepo = dataSource.getRepository(Category);
  const categories: Category[] = [];

  // Create root categories
  const rootCategories = YACHT_CATEGORIES.root.slice(
    0,
    SEED_CONFIG.categories.root,
  );

  for (const categoryName of rootCategories) {
    const category = categoryRepo.create({
      name: categoryName,
      description: faker.commerce.productDescription(),
      parent_id: null,
    });
    const saved = await categoryRepo.save(category);
    categories.push(saved);
    console.log(`  ✓ Created root category: ${categoryName}`);

    // Create child categories
    const childNames =
      YACHT_CATEGORIES.children[
        categoryName as keyof typeof YACHT_CATEGORIES.children
      ] ||
      Array(SEED_CONFIG.categories.children)
        .fill(null)
        .map(() => faker.commerce.department());

    for (const childName of childNames.slice(
      0,
      SEED_CONFIG.categories.children,
    )) {
      const child = categoryRepo.create({
        name: childName,
        description: faker.commerce.productDescription(),
        parent_id: saved.id,
      });
      const savedChild = await categoryRepo.save(child);
      categories.push(savedChild);
      console.log(`    ↳ Created child category: ${childName}`);
    }
  }

  console.log(
    `✅ Created ${categories.length} categories (${rootCategories.length} root, ${categories.length - rootCategories.length} children)\n`,
  );

  return categories;
}

async function seedSuppliers(dataSource: DataSource): Promise<Supplier[]> {
  console.log('🏢 Seeding suppliers...');

  const supplierRepo = dataSource.getRepository(Supplier);
  const suppliers: Supplier[] = [];

  for (let i = 0; i < SEED_CONFIG.suppliers; i++) {
    const supplier = supplierRepo.create({
      name: faker.company.name(),
      contact_person: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: faker.location.streetAddress({ useFullAddress: true }),
      website: faker.internet.url(),
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.3,
      }),
      is_active: faker.helpers.maybe(() => false, { probability: 0.1 }) ?? true,
    });

    const saved = await supplierRepo.save(supplier);
    suppliers.push(saved);
  }

  console.log(`✅ Created ${suppliers.length} suppliers\n`);

  return suppliers;
}

async function seedProducts(
  dataSource: DataSource,
  categories: Category[],
  suppliers: Supplier[],
): Promise<Product[]> {
  console.log('📦 Seeding products...');

  const productRepo = dataSource.getRepository(Product);
  const products: Product[] = [];

  // Get only leaf categories (those without children) for products
  const leafCategories = categories.filter((cat) => cat.parent_id !== null);

  for (let i = 0; i < SEED_CONFIG.products; i++) {
    const category = faker.helpers.arrayElement(leafCategories);
    const supplier = faker.helpers.arrayElement(suppliers);
    const standardCost = faker.number.float({
      min: 5,
      max: 5000,
      fractionDigits: 2,
    });
    const markupPercentage = faker.number.float({
      min: 10,
      max: 100,
      fractionDigits: 2,
    });
    const standardPrice = standardCost * (1 + markupPercentage / 100);

    const product = productRepo.create({
      sku: `SKU-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
      name: faker.commerce.productName(),
      description: faker.helpers.maybe(
        () => faker.commerce.productDescription(),
        { probability: 0.7 },
      ),
      category_id: category.id,
      brand_id: faker.helpers.maybe(() => faker.string.uuid(), {
        probability: 0.6,
      }),
      volume_ml: faker.helpers.maybe(
        () => faker.number.int({ min: 100, max: 5000 }),
        { probability: 0.5 },
      ),
      weight_kg: faker.helpers.maybe(
        () => faker.number.float({ min: 0.1, max: 50, fractionDigits: 3 }),
        { probability: 0.7 },
      ),
      dimensions_cm: faker.helpers.maybe(
        () =>
          `${faker.number.int({ min: 5, max: 100 })}x${faker.number.int({ min: 5, max: 100 })}x${faker.number.int({ min: 5, max: 100 })}`,
        { probability: 0.6 },
      ),
      standard_cost: standardCost,
      standard_price: Number.parseFloat(standardPrice.toFixed(2)),
      markup_percentage: markupPercentage,
      reorder_point: faker.number.int({ min: 0, max: 50 }),
      primary_supplier_id: supplier.id,
      supplier_sku: faker.helpers.maybe(
        () =>
          `SUP-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
        { probability: 0.8 },
      ),
      is_active: faker.helpers.maybe(() => false, { probability: 0.1 }) ?? true,
      is_perishable:
        faker.helpers.maybe(() => true, { probability: 0.2 }) ?? false,
      notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
        probability: 0.3,
      }),
      created_by: MOCK_USER_ID,
      updated_by: MOCK_USER_ID,
    });

    const saved = await productRepo.save(product);
    products.push(saved);

    if ((i + 1) % 20 === 0) {
      console.log(`  ✓ Created ${i + 1}/${SEED_CONFIG.products} products`);
    }
  }

  console.log(`✅ Created ${products.length} products\n`);

  return products;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  let dataSource: DataSource | null = null;

  try {
    // Initialize data source
    dataSource = await createDataSource();
    console.log('✅ Database connected\n');

    // Clear existing data
    await clearDatabase(dataSource);

    // Seed data
    const categories = await seedCategories(dataSource);
    const suppliers = await seedSuppliers(dataSource);
    const products = await seedProducts(dataSource, categories, suppliers);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
Summary:
  - Categories: ${categories.length}
  - Suppliers: ${suppliers.length}
  - Products: ${products.length}
`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

void main();
