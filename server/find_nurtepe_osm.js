const axios = require('axios');

async function findNurtepeOSM() {
  const overpassUrl = 'http://overpass-api.de/api/interpreter';
  const query = `
    [out:json];
    area["name"="İstanbul"]->.searchArea;
    (
      node["name"~"Nurtepe Kuaför",i](area.searchArea);
      way["name"~"Nurtepe Kuaför",i](area.searchArea);
      node["name"~"Nurtepe",i]["shop"="hairdresser"](area.searchArea);
      way["name"~"Nurtepe",i]["shop"="hairdresser"](area.searchArea);
    );
    out body;
  `;

  try {
    const response = await axios.post(overpassUrl, query);
    console.log(JSON.stringify(response.data.elements, null, 2));
  } catch (error) {
    console.error('Error fetching from OSM:', error.message);
  }
}

findNurtepeOSM();
