import { LocationType } from '@librestock/types/locations';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import {
  auditLogs,
  stockMovements,
  orderItems,
  orders,
  inventory,
  supplierProducts,
  areas,
  locations,
  clients,
  products,
  suppliers,
  categories,
} from '../../effect/platform/db/schema';

export const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export const SEED_CONFIG = {
  categories: { root: 10, children: 3 },
  suppliers: 20,
  products: 100,
  locations: 8,
  areasPerLocation: 4,
  subAreasPerArea: 2,
  clients: 15,
  inventoryRecords: 200,
  orders: 30,
  itemsPerOrder: { min: 1, max: 6 },
  stockMovements: 80,
  auditLogs: 100,
  supplierProducts: 60,
};

export const YACHT_CATEGORIES = {
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
    'Galley & Provisions': ['Beverages', 'Dry Goods', 'Fresh Produce', 'Frozen Foods', 'Cookware', 'Tableware'],
    'Deck & Exterior': ['Ropes & Lines', 'Fenders', 'Anchoring', 'Deck Hardware', 'Lighting'],
    'Electronics & Navigation': ['GPS & Chartplotters', 'Communication', 'Entertainment', 'Instruments'],
    'Safety Equipment': ['Life Jackets', 'Fire Safety', 'First Aid', 'Emergency Signals'],
    'Engine Room': ['Fuel Systems', 'Lubricants', 'Filters', 'Tools', 'Spare Parts'],
    'Interior & Accommodation': ['Linens & Bedding', 'Furniture', 'Lighting', 'Decor'],
    'Water Sports': ['Diving Equipment', 'Snorkeling', 'Toys & Inflatables', 'Fishing Gear'],
    'Cleaning & Maintenance': ['Cleaning Supplies', 'Polishes & Waxes', 'Paints & Coatings', 'Hand Tools'],
    'Medical Supplies': ['Medications', 'First Aid', 'Personal Care'],
    'Office & Administration': ['Stationery', 'Documentation', 'Storage'],
  },
};

export const YACHT_NAMES = [
  'Lady Aurora', 'Sea Breeze', 'Ocean Pearl', 'Silver Wave', 'Blue Horizon',
  'Golden Star', 'Crystal Sea', 'Wind Dancer', "Neptune's Grace", 'Poseidon',
  'Coral Reef', 'Sunset Voyager', 'Mystic Tide', 'Azure Dream', 'Storm Chaser',
];

export const LOCATION_NAMES: { name: string; type: LocationType }[] = [
  { name: 'Main Warehouse - Port Hercule', type: LocationType.WAREHOUSE },
  { name: 'Cold Storage Facility', type: LocationType.WAREHOUSE },
  { name: 'Dry Goods Warehouse', type: LocationType.WAREHOUSE },
  { name: 'Electronics Workshop', type: LocationType.WAREHOUSE },
  { name: 'In-Transit Staging', type: LocationType.IN_TRANSIT },
  { name: 'Marina Delivery Point', type: LocationType.CLIENT },
  { name: 'Supplier Dropoff - Nice', type: LocationType.SUPPLIER },
  { name: 'Supplier Dropoff - Antibes', type: LocationType.SUPPLIER },
];

export const AREA_TEMPLATES: Record<string, string[]> = {
  warehouse: ['Aisle A', 'Aisle B', 'Aisle C', 'Receiving Dock', 'Packing Area', 'Returns Zone'],
  cold_storage: ['Freezer Section', 'Chiller Section', 'Fresh Produce Bay', 'Dairy Section'],
  workshop: ['Workbench Area', 'Testing Station', 'Component Racks', 'Shipping Prep'],
};

export const SUB_AREA_TEMPLATES = [
  'Shelf 1', 'Shelf 2', 'Shelf 3', 'Bin A', 'Bin B',
  'Rack Top', 'Rack Bottom', 'Floor Level', 'Pallet Zone',
];

export async function createDatabase(): Promise<NodePgDatabase> {
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

export async function clearDatabase(db: NodePgDatabase) {
  console.log('Clearing existing data...');

  await db.delete(auditLogs);
  await db.delete(stockMovements);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(inventory);
  await db.delete(supplierProducts);
  await db.delete(areas);
  await db.delete(locations);
  await db.delete(clients);
  await db.delete(products);
  await db.delete(suppliers);
  await db.delete(categories);

  console.log('Database cleared\n');
}
