import { LocationType } from '@librestock/types';
import { DataSource } from 'typeorm';
import { Area } from '../../routes/areas/entities/area.entity';
import { AuditLog } from '../../routes/audit-logs/entities/audit-log.entity';
import { Category } from '../../routes/categories/entities/category.entity';
import { Client } from '../../routes/clients/entities/client.entity';
import { Inventory } from '../../routes/inventory/entities/inventory.entity';
import { Location } from '../../routes/locations/entities/location.entity';
import { OrderItem } from '../../routes/orders/entities/order-item.entity';
import { Order } from '../../routes/orders/entities/order.entity';
import { Photo } from '../../routes/photos/entities/photo.entity';
import { Product } from '../../routes/products/entities/product.entity';
import { StockMovement } from '../../routes/stock-movements/entities/stock-movement.entity';
import { SupplierProduct } from '../../routes/suppliers/entities/supplier-product.entity';
import { Supplier } from '../../routes/suppliers/entities/supplier.entity';

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

export async function createDataSource(): Promise<DataSource> {
  const dataSourceConfig: any = {
    type: 'postgres',
    entities: [
      Category, Supplier, SupplierProduct, Product, Photo, Location, Area,
      Inventory, Client, Order, OrderItem, StockMovement, AuditLog,
    ],
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

export async function clearDatabase(dataSource: DataSource) {
  console.log('Clearing existing data...');

  await dataSource.query('DELETE FROM audit_logs');
  await dataSource.query('DELETE FROM stock_movements');
  await dataSource.query('DELETE FROM order_items');
  await dataSource.query('DELETE FROM orders');
  await dataSource.query('DELETE FROM inventory');
  await dataSource.query('DELETE FROM supplier_products');
  await dataSource.query('DELETE FROM areas');
  await dataSource.query('DELETE FROM locations');
  await dataSource.query('DELETE FROM clients');
  await dataSource.query('DELETE FROM products');
  await dataSource.query('DELETE FROM suppliers');
  await dataSource.query('DELETE FROM categories');

  console.log('Database cleared\n');
}
