// scripts/seed.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../src/config/supabase.js';

// Resolve directory paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE_PATH = path.join(__dirname, '../../data.js');

async function seed() {
  console.log('🌱 Starting database seeding process...');

  // Check if credentials are set
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (
    !supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_PROJECT_URL' ||
    !supabaseKey || supabaseKey === 'YOUR_SUPABASE_ANON_KEY'
  ) {
    console.error('❌ Error: Supabase credentials are not configured in backend/.env. Cannot seed database.');
    process.exit(1);
  }

  // 1. Read and parse data.js
  let products = [];
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      throw new Error(`data.js file not found at: ${DATA_FILE_PATH}`);
    }

    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8');

    // Setup global window object to capture the data.js content
    const mockWindow = {};
    const evalCode = `
      const window = this;
      ${fileContent}
    `;

    // Evaluate the file content inside a function execution context
    const fn = new Function(evalCode);
    fn.call(mockWindow);

    if (!mockWindow.CreativeData || !mockWindow.CreativeData.products) {
      throw new Error('Failed to find CreativeData.products in data.js');
    }

    products = mockWindow.CreativeData.products;
    console.log(`✅ Successfully loaded ${products.length} products from data.js`);
  } catch (err) {
    console.error('❌ Error reading data.js:', err.message);
    process.exit(1);
  }

  // 2. Map frontend schema to the updated Supabase products table schema
  const mappedProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: Number(p.price) || 0,
    stock: Object.values(p.stockByWarehouse || {}).reduce((sum, qty) => sum + Number(qty), 0),
    min_order_qty: Number(p.minOrder) || 1,
    material: p.material,
    thickness: p.thickness,
    compatibility: p.compatibility || [],
    image_url: p.image,
    specs: {
      grade: p.grade,
      weight: p.weight,
      dimensions: p.dimensions,
      delivery_time: p.deliveryTime,
      description: p.description
    }
  }));

  // 3. Upsert into Supabase products table
  try {
    console.log('🔄 Upserting products to Supabase...');
    const { data, error } = await supabase
      .from('products')
      .upsert(mappedProducts, { onConflict: 'id' })
      .select();

    if (error) {
      throw error;
    }

    console.log(`🎉 Seeding complete! Successfully upserted ${data.length} products to the database.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error upserting to database:', err.message);
    console.error('Please verify that:');
    console.error('1. The "products" table exists in your Supabase project (run schema.sql).');
    console.error('2. Row Level Security (RLS) is disabled or permits anonymous inserts.');
    process.exit(1);
  }
}

seed();
