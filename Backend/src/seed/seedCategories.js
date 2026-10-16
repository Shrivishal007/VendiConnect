/**
 * seed/seedCategories.js
 * -----------------------------------------------------------------------
 * Run once to populate the Category collection in MongoDB.
 * Usage: node seed/seedCategories.js
 * -----------------------------------------------------------------------
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Category from '../models/Category.js';
const CATEGORIES = [
  { Name: 'Vegetables' },
  { Name: 'Fruits' },
  { Name: 'Street Food' },
  { Name: 'Dairy & Eggs' },
  { Name: 'Fish & Meat' },
  { Name: 'Flowers' },
  { Name: 'Snacks & Bakery' },
  { Name: 'Household Items' },
];
async function seed() {
  await connectDB();
  const existing = await Category.countDocuments();
  if (existing > 0) {
    console.log(`[Seed] ${existing} categories already exist. Skipping.`);
    console.log('[Seed] To re-seed, manually drop the categories collection first.');
  } else {
    const inserted = await Category.insertMany(CATEGORIES);
    console.log(`[Seed] ✅ Inserted ${inserted.length} categories:`);
    inserted.forEach(c => console.log(`  • ${c._id}  →  ${c.Name}`));
  }
  await mongoose.disconnect();
  console.log('[Seed] Done.');
}
seed().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
