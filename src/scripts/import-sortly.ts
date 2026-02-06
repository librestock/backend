import * as fs from 'node:fs';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { parse } from 'csv-parse/sync';
import { Category } from '../routes/categories/entities/category.entity';
import { Product } from '../routes/products/entities/product.entity';
import { Location } from '../routes/locations/entities/location.entity';
import { Inventory } from '../routes/inventory/entities/inventory.entity';
import { StockMovement } from '../routes/stock-movements/entities/stock-movement.entity';
import { StockMovementReason } from '../common/enums/stock-movement-reason.enum';
import { LocationType } from '../common/enums/location-type.enum';

config();

// Mock user ID for stock movements (you may want to pass this as a parameter)
const IMPORT_USER_ID = 'import_sortly_user';

interface SortlyRecord {
  'Entry Name': string;
  'Variant Details': string;
  'Sortly ID (SID)': string;
  Unit: string;
  'Min Level': string;
  Price: string;
  Value: string;
  Notes: string;
  Tags: string;
  'Barcode/QR1-Data': string;
  'Barcode/QR1-Type': string;
  'Barcode/QR2-Data': string;
  'Barcode/QR2-Type': string;
  'Transaction Date (CEST)': string;
  'Transaction Type': string;
  'QTY change (Quantity Delta)': string;
  'New QTY': string;
  Folder: string;
  'Folder SID': string;
  User: string;
  'Transaction Note': string;
  Location: string;
  'Expiry Date': string;
}

interface ImportStats {
  categoriesCreated: number;
  locationsCreated: number;
  productsCreated: number;
  stockMovementsCreated: number;
  inventoryRecordsCreated: number;
  skippedTransactions: number;
  errors: { row: number; error: string }[];
}

async function createDataSource(): Promise<DataSource> {
  const dataSourceConfig: any = {
    type: 'postgres',
    entities: [Category, Product, Location, Inventory, StockMovement],
    synchronize: false,
  };

  if (process.env.DATABASE_URL) {
    dataSourceConfig.url = process.env.DATABASE_URL;
  } else {
    dataSourceConfig.host = process.env.PGHOST ?? 'localhost';
    dataSourceConfig.port = Number.parseInt(process.env.PGPORT ?? '5432');
    dataSourceConfig.username = process.env.PGUSER;
    dataSourceConfig.password = process.env.PGPASSWORD;
    dataSourceConfig.database =
      process.env.PGDATABASE ?? 'librestock_inventory';
  }

  const dataSource = new DataSource(dataSourceConfig);
  await dataSource.initialize();
  return dataSource;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    // Parse format: "28/08/2025 01:26PM"
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');

    // Handle time with AM/PM
    let hours = 0;
    let minutes = 0;
    if (timePart) {
      const isPM = timePart.toLowerCase().includes('pm');
      const timeOnly = timePart.replace(/[ap]m/i, '');
      const [h, m] = timeOnly.split(':');
      hours = Number.parseInt(h);
      minutes = Number.parseInt(m);

      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }

    return new Date(
      Number.parseInt(year),
      Number.parseInt(month) - 1,
      Number.parseInt(day),
      hours,
      minutes,
    );
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}, error: ${String(error)}`);
    return null;
  }
}

function mapTransactionTypeToReason(
  transactionType: string,
): StockMovementReason {
  const typeMap: Record<string, StockMovementReason> = {
    Create: StockMovementReason.PURCHASE_RECEIVE,
    'Update Quantity': StockMovementReason.COUNT_CORRECTION,
    'Update Quantity (Sold)': StockMovementReason.SALE,
    'Update Quantity (Restocked)': StockMovementReason.PURCHASE_RECEIVE,
    'Update Quantity (Returned)': StockMovementReason.RETURN_FROM_CLIENT,
    'Update Quantity (Stocktake)': StockMovementReason.COUNT_CORRECTION,
    'Update Quantity (Damaged)': StockMovementReason.DAMAGED,
    'Update Quantity (Consumed)': StockMovementReason.SALE,
    Move: StockMovementReason.INTERNAL_TRANSFER,
    'Move (Replenish)': StockMovementReason.INTERNAL_TRANSFER,
    Clone: StockMovementReason.COUNT_CORRECTION,
    Delete: StockMovementReason.WASTE,
  };

  return typeMap[transactionType] ?? StockMovementReason.COUNT_CORRECTION;
}

async function getOrCreateCategory(
  dataSource: DataSource,
  folderName: string,
  categoryCache: Map<string, string>,
): Promise<string | null> {
  if (!folderName) return null;
  if (categoryCache.has(folderName)) {
    return categoryCache.get(folderName)!;
  }

  const categoryRepo = dataSource.getRepository(Category);

  // Check if category exists
  let category = await categoryRepo.findOne({ where: { name: folderName } });

  if (!category) {
    // Create new category
    category = categoryRepo.create({
      name: folderName,
      description: `Imported from Sortly`,
    });
    category = await categoryRepo.save(category);
    console.log(`  ✓ Created category: ${folderName}`);
  }

  categoryCache.set(folderName, category.id);
  return category.id;
}

async function getOrCreateLocation(
  dataSource: DataSource,
  locationName: string,
  locationCache: Map<string, string>,
): Promise<string | null> {
  if (!locationName) return null;
  if (locationCache.has(locationName)) {
    return locationCache.get(locationName)!;
  }

  const locationRepo = dataSource.getRepository(Location);

  // Check if location exists
  let location = await locationRepo.findOne({ where: { name: locationName } });

  if (!location) {
    // Create new location
    location = locationRepo.create({
      name: locationName,
      type: LocationType.WAREHOUSE,
      is_active: true,
    });
    location = await locationRepo.save(location);
    console.log(`  ✓ Created location: ${locationName}`);
  }

  locationCache.set(locationName, location.id);
  return location.id;
}

async function importSortlyData(
  dataSource: DataSource,
  csvFilePath: string,
): Promise<ImportStats> {
  const stats: ImportStats = {
    categoriesCreated: 0,
    locationsCreated: 0,
    productsCreated: 0,
    stockMovementsCreated: 0,
    inventoryRecordsCreated: 0,
    skippedTransactions: 0,
    errors: [],
  };

  console.log(`📂 Reading CSV file: ${csvFilePath}`);

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const records: SortlyRecord[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📋 Found ${records.length} transaction records\n`);

  // Caches to avoid duplicate lookups
  const categoryCache = new Map<string, string>();
  const locationCache = new Map<string, string>();
  const productCache = new Map<string, string>(); // SID -> Product ID
  const inventoryCache = new Map<string, string>(); // product_id:location_id -> Inventory ID

  const productRepo = dataSource.getRepository(Product);
  const stockMovementRepo = dataSource.getRepository(StockMovement);
  const inventoryRepo = dataSource.getRepository(Inventory);

  // Process records in order (chronological)
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNum = i + 2; // +2 for header row and 0-indexing

    try {
      const sortlyId = record['Sortly ID (SID)'];
      const entryName = record['Entry Name'];
      const folderName = record.Folder;
      const locationName = record.Location;
      const quantityDelta =
        Number.parseFloat(record['QTY change (Quantity Delta)']) || 0;
      const newQty = Number.parseFloat(record['New QTY']) || 0;
      const transactionType = record['Transaction Type'];
      const transactionDate = parseDate(record['Transaction Date (CEST)']);
      const expiryDate = parseDate(record['Expiry Date']);

      if (!sortlyId || !entryName) {
        stats.skippedTransactions++;
        continue;
      }

      // Get or create category
      const categoryId = await getOrCreateCategory(
        dataSource,
        folderName,
        categoryCache,
      );

      // Get or create location
      const locationId = locationName
        ? await getOrCreateLocation(dataSource, locationName, locationCache)
        : null;

      // Check if product exists
      let productId = productCache.get(sortlyId);

      if (!productId) {
        // Try to find existing product by SKU (using Sortly ID as SKU)
        let product = await productRepo.findOne({
          where: { sku: sortlyId },
        });

        if (!product) {
          // Create product on first transaction (usually "Create" type)
          if (!categoryId) {
            stats.errors.push({
              row: rowNum,
              error: `Cannot create product without category`,
            });
            stats.skippedTransactions++;
            continue;
          }

          const price = Number.parseFloat(record.Price) || null;

          product = productRepo.create({
            sku: sortlyId,
            name: entryName,
            description: record.Notes || null,
            category_id: categoryId,
            unit: record.Unit || null,
            barcode: record['Barcode/QR1-Data'] || null,
            standard_price: price,
            reorder_point: Number.parseInt(record['Min Level']) || 0,
            is_active: true,
            is_perishable: !!expiryDate,
            created_by: IMPORT_USER_ID,
            updated_by: IMPORT_USER_ID,
          });

          product = await productRepo.save(product);
          stats.productsCreated++;
          console.log(`  ✓ Created product: ${entryName} (${sortlyId})`);
        }

        productId = product.id;
        productCache.set(sortlyId, productId);
      }

      // Create stock movement
      if (quantityDelta !== 0) {
        const reason = mapTransactionTypeToReason(transactionType);

        const stockMovement = stockMovementRepo.create({
          product_id: productId,
          from_location_id: quantityDelta < 0 ? locationId : null,
          to_location_id: quantityDelta > 0 ? locationId : null,
          quantity: Math.abs(quantityDelta),
          reason,
          reference_number: sortlyId,
          user_id: IMPORT_USER_ID,
          notes:
            record['Transaction Note'] ||
            `${transactionType} from Sortly import`,
          created_at: transactionDate ?? new Date(),
        });

        await stockMovementRepo.save(stockMovement);
        stats.stockMovementsCreated++;
      }

      // Update or create inventory record
      if (locationId) {
        const inventoryCacheKey = `${productId}:${locationId}`;
        const inventoryId = inventoryCache.get(inventoryCacheKey);

        if (!inventoryId) {
          // Try to find existing inventory
          let inventory = await inventoryRepo.findOne({
            where: {
              product_id: productId,
              location_id: locationId,
            },
          });

          if (!inventory) {
            inventory = inventoryRepo.create({
              product_id: productId,
              location_id: locationId,
              quantity: newQty,
              expiry_date: expiryDate,
            });
            inventory = await inventoryRepo.save(inventory);
            stats.inventoryRecordsCreated++;
            inventoryCache.set(inventoryCacheKey, inventory.id);
          } else {
            // Update quantity
            inventory.quantity = newQty;
            if (expiryDate) {
              inventory.expiry_date = expiryDate;
            }
            await inventoryRepo.save(inventory);
          }
        } else {
          // Update existing inventory
          await inventoryRepo.update(inventoryId, {
            quantity: newQty,
            ...(expiryDate && { expiry_date: expiryDate }),
          });
        }
      }

      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(
          `  ⏳ Processed ${i + 1}/${records.length} transactions...`,
        );
      }
    } catch (error) {
      stats.errors.push({
        row: rowNum,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`  ❌ Error on row ${rowNum}:`, error);
    }
  }

  // Final stats
  stats.categoriesCreated = categoryCache.size;
  stats.locationsCreated = locationCache.size;

  return stats;
}

async function main() {
  console.log('🔄 Starting Sortly CSV import...\n');

  const csvFilePath = '../../sortly.csv';

  if (!csvFilePath) {
    console.error('❌ Please provide a CSV file path as an argument');
    console.log('Usage: npm run import:sortly <path-to-csv-file>');
    process.exit(1);
  }

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  let dataSource: DataSource | null = null;

  try {
    dataSource = await createDataSource();
    console.log('✅ Database connected\n');

    const stats = await importSortlyData(dataSource, csvFilePath);

    console.log('\n🎉 Import completed!\n');
    console.log('Summary:');
    console.log(`  - Categories created: ${stats.categoriesCreated}`);
    console.log(`  - Locations created: ${stats.locationsCreated}`);
    console.log(`  - Products created: ${stats.productsCreated}`);
    console.log(`  - Stock movements created: ${stats.stockMovementsCreated}`);
    console.log(
      `  - Inventory records created: ${stats.inventoryRecordsCreated}`,
    );
    console.log(`  - Transactions skipped: ${stats.skippedTransactions}`);

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
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
      console.log('\n✅ Database connection closed');
    }
  }
}

void main();
