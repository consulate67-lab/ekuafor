const axios = require('axios');

async function findNurtepe() {
  const overpassQuery = `
    [out:json][timeout:90];
    area["name"="İstanbul"]->.cityArea; 
    area["name"="Kağıthane"](area.cityArea)->.searchArea;
    (
      node["shop"~"hairdresser|beauty_shop"](area.searchArea);
      way["shop"~"hairdresser|beauty_shop"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter',
      `data=${encodeURIComponent(overpassQuery)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const elements = response.data.elements.filter(el => el.tags && el.tags.name && el.tags.name.includes('Nurtepe'));
    
    console.log('Search Results for "Nurtepe":');
    console.log(JSON.stringify(elements, null, 2));

  } catch (err) {
    console.error(err.message);
  }
}

findNurtepe();
