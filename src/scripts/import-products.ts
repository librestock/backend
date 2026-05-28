import * as fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { LocationType } from '@stocket/types/locations';
import { categories, inventory, locations, products } from '../effect/platform/db/schema';

const IMPORT_USER_ID = 'import_products_user';

interface NormalizedProductRecord {
  sku: string;
  name: string;
  category_path: string;
  reorder_point: string;
  quantity: string;
  location: string;
  unit: string;
  standard_price: string;
  barcode: string;
  description: string;
  notes: string;
  is_active: string;
  is_perishable: string;
  expiry_date: string;
}

interface ImportStats {
  categoriesCreated: number;
  locationsCreated: number;
  productsCreated: number;
  productsUpdated: number;
  inventoryRecordsCreated: number;
  inventoryRecordsUpdated: number;
  rowsSkipped: number;
  errors: { row: number; error: string }[];
}

async function createDatabase(): Promise<NodePgDatabase> {
  const pool = new pg.Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PGHOST ?? 'localhost',
          port: Number.parseInt(process.env.PGPORT ?? '5432'),
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE ?? 'librestock_inventory',
        },
  );
  return drizzle(pool);
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const isoDate = new Date(dateStr);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;

  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return null;

  const [day, month, year] = datePart.split('/');
  if (!day || !month || !year) return null;

  let hours = 0;
  let minutes = 0;
  if (timePart) {
    const isPM = timePart.toLowerCase().includes('pm');
    const timeOnly = timePart.replace(/[ap]m/i, '');
    const [h, m] = timeOnly.split(':');
    if (!h || !m) return null;
    hours = Number.parseInt(h, 10);
    minutes = Number.parseInt(m, 10);

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }

  return new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    hours,
    minutes,
  );
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value || value.trim() === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

async function getOrCreateCategoryPath(
  db: NodePgDatabase,
  categoryPath: string,
  categoryCache: Map<string, string>,
): Promise<string> {
  const cleanParts = categoryPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = cleanParts.length > 0 ? cleanParts : ['Uncategorized'];

  let parentId: string | null = null;
  let categoryId = '';

  for (const part of parts) {
    const cacheKey = `${parentId ?? 'root'}:${part}`;
    const cached = categoryCache.get(cacheKey);
    if (cached) {
      parentId = cached;
      categoryId = cached;
      continue;
    }

    const rows = await db.select().from(categories).where(
      parentId
        ? and(eq(categories.name, part), eq(categories.parent_id, parentId))
        : and(eq(categories.name, part), isNull(categories.parent_id)),
    ).limit(1);
    let category = rows[0] ?? null;

    if (!category) {
      const [created] = await db.insert(categories).values({
        name: part,
        parent_id: parentId,
        description: 'Imported via product import',
      }).returning();
      category = created!;
      console.log(`  ✓ Created category: ${parts.join(' / ')}`);
    }

    categoryCache.set(cacheKey, category.id);
    parentId = category.id;
    categoryId = category.id;
  }

  return categoryId;
}

async function getOrCreateLocation(
  db: NodePgDatabase,
  locationName: string,
  locationCache: Map<string, string>,
): Promise<string | null> {
  const name = locationName.trim();
  if (!name) return null;

  const cached = locationCache.get(name);
  if (cached) return cached;

  const rows = await db.select().from(locations).where(eq(locations.name, name)).limit(1);
  let location = rows[0] ?? null;

  if (!location) {
    const [created] = await db.insert(locations).values({
      name,
      type: LocationType.WAREHOUSE,
      is_active: true,
    }).returning();
    location = created!;
    console.log(`  ✓ Created location: ${name}`);
  }

  locationCache.set(name, location.id);
  return location.id;
}

async function importProducts(
  db: NodePgDatabase,
  csvFilePath: string,
): Promise<ImportStats> {
  const stats: ImportStats = {
    categoriesCreated: 0,
    locationsCreated: 0,
    productsCreated: 0,
    productsUpdated: 0,
    inventoryRecordsCreated: 0,
    inventoryRecordsUpdated: 0,
    rowsSkipped: 0,
    errors: [],
  };

  console.log(`📂 Reading normalized product CSV: ${csvFilePath}`);

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records: NormalizedProductRecord[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const categoryCache = new Map<string, string>();
  const locationCache = new Map<string, string>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNum = i + 2;

    try {
      if (!record?.sku || !record.name) {
        stats.errors.push({ row: rowNum, error: 'Cannot import product without sku and name' });
        stats.rowsSkipped++;
        continue;
      }

      const categoryId = await getOrCreateCategoryPath(
        db,
        record.category_path || 'Uncategorized',
        categoryCache,
      );
      const expiryDate = parseDate(record.expiry_date);
      const productValues = {
        name: record.name,
        description: record.description || null,
        category_id: categoryId,
        unit: record.unit || null,
        barcode: record.barcode || null,
        standard_price: Number.parseFloat(record.standard_price) || null,
        reorder_point: Number.parseInt(record.reorder_point, 10) || 0,
        is_active: parseBoolean(record.is_active, true),
        is_perishable: parseBoolean(record.is_perishable, !!expiryDate),
        notes: record.notes || null,
        updated_by: IMPORT_USER_ID,
      };

      const existingProducts = await db.select().from(products).where(eq(products.sku, record.sku)).limit(1);
      let product = existingProducts[0] ?? null;

      if (!product) {
        const [created] = await db.insert(products).values({
          sku: record.sku,
          ...productValues,
          created_by: IMPORT_USER_ID,
        }).returning();
        product = created!;
        stats.productsCreated++;
      } else {
        const [updated] = await db.update(products).set(productValues).where(eq(products.id, product.id)).returning();
        product = updated!;
        stats.productsUpdated++;
      }

      const locationId = await getOrCreateLocation(db, record.location || '', locationCache);
      if (locationId) {
        const existingInventory = await db.select().from(inventory).where(and(
          eq(inventory.product_id, product.id),
          eq(inventory.location_id, locationId),
        )).limit(1);
        const existing = existingInventory[0] ?? null;
        const quantity = Number.parseFloat(record.quantity) || 0;

        if (!existing) {
          await db.insert(inventory).values({
            product_id: product.id,
            location_id: locationId,
            quantity,
            expiry_date: expiryDate,
          });
          stats.inventoryRecordsCreated++;
        } else {
          await db.update(inventory).set({
            quantity,
            ...(expiryDate && { expiry_date: expiryDate }),
          }).where(eq(inventory.id, existing.id));
          stats.inventoryRecordsUpdated++;
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  ⏳ Processed ${i + 1}/${records.length} rows...`);
      }
    } catch (error) {
      stats.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`  ❌ Error on row ${rowNum}:`, error);
    }
  }

  stats.categoriesCreated = categoryCache.size;
  stats.locationsCreated = locationCache.size;

  return stats;
}

async function main() {
  console.log('🔄 Starting normalized product import...\n');

  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.error('Please provide a normalized product CSV file path as an argument');
    console.error('Usage: pnpm import:products <path-to-normalized-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  let db: NodePgDatabase | null = null;

  try {
    db = await createDatabase();
    console.log('✅ Database connected\n');

    const stats = await importProducts(db, csvFilePath);

    console.log('\n🎉 Import completed!\n');
    console.log('Summary:');
    console.log(`  - Categories created: ${stats.categoriesCreated}`);
    console.log(`  - Locations created: ${stats.locationsCreated}`);
    console.log(`  - Products created: ${stats.productsCreated}`);
    console.log(`  - Products updated: ${stats.productsUpdated}`);
    console.log(`  - Inventory records created: ${stats.inventoryRecordsCreated}`);
    console.log(`  - Inventory records updated: ${stats.inventoryRecordsUpdated}`);
    console.log(`  - Rows skipped: ${stats.rowsSkipped}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.slice(0, 10).forEach((err) => {
        console.log(`  - Row ${err.row}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      const pool = (db as any)._.session?.client;
      if (pool?.end) {
        await pool.end();
      }
      console.log('\n✅ Database connection closed');
    }
  }
}

void main();
