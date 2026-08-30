// Test: Overpass API with User-Agent + timeout
const query = `[out:json][timeout:30];area["name"="İstanbul"];(node["shop"="hairdresser"](area);node["shop"="beauty"](area););out 5 center;`;

console.log('Fetching...');
const start = Date.now();

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 20000);

fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'SalonCebinde-OSM-Importer/1.0 (selim@saloncebinde.com)'
  },
  body: 'data=' + encodeURIComponent(query),
  signal: controller.signal
})
  .then(async r => {
    clearTimeout(timeoutId);
    console.log('Status:', r.status, r.statusText);
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`);
    }
    return r.json();
  })
  .then(data => {
    console.log(`Done in ${Date.now() - start}ms`);
    const elems = data.elements || [];
    console.log(`Found ${elems.length} POIs\n`);
    elems.slice(0, 5).forEach(e => {
      const t = e.tags || {};
      const lat = e.lat ?? e.center?.lat;
      const lon = e.lon ?? e.center?.lon;
      console.log(`[${e.id}] ${t.name || 'NO NAME'}`);
      console.log(`    phone: ${t.phone || t['contact:phone'] || '-'}`);
      console.log(`    addr:  ${t['addr:full'] || [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || '-'}`);
      console.log(`    city:  ${t['addr:city'] || '-'}`);
      console.log(`    loc:   ${lat?.toFixed(4)}, ${lon?.toFixed(4)}`);
      console.log(`    web:   ${t.website || t['contact:website'] || '-'}`);
      console.log(`    hours: ${t.opening_hours || '-'}`);
      console.log('');
    });
  })
  .catch(e => {
    clearTimeout(timeoutId);
    console.error('Error:', e.message);
  });
