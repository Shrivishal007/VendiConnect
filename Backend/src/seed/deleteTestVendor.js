import '../db/connection.js'; // reuses existing connect logic + dotenv
import Vendor from '../models/Vendor.js';

// Give connection time to establish
setTimeout(async () => {
  const result = await Vendor.deleteMany({ VendorName: 'Ram Fresh Vegetables' });
  console.log(`[Delete] Removed ${result.deletedCount} vendor(s)`);
  process.exit(0);
}, 3000);

