// CLI shim — asıl mantık src/jobs/import-osm.ts'te.
// Build edilmez, sadece tsx ile çalıştırılır.
// Kullanım: npx tsx scripts/import-osm.ts [limit]
//   limit=5 (default) veya 0 (TÜM İstanbul)

import { runOsmImport } from '../src/jobs/import-osm';
import { pool } from '../src/db';

const COUNT = parseInt(process.argv[2] || '5', 10);
console.log(`[import-osm] Script modu: ${COUNT > 0 ? `${COUNT} POI` : 'FULL İstanbul'}`);

runOsmImport({ limit: COUNT })
  .then(r => {
    console.log(JSON.stringify(r, null, 2));
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch(async e => {
    console.error('[import-osm] Fatal:', e);
    try { await pool.end(); } catch {}
    process.exit(1);
  });
