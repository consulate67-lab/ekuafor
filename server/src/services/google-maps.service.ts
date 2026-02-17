import axios from 'axios';

export interface MapsBusiness {
    name: string;
    address: string;
    phone?: string;
    latitude: number;
    longitude: number;
    place_id: string;
    rating?: number;
    user_ratings_total?: number;
}

class GoogleMapsService {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    }

    async searchBusinesses(query: string, lat?: number, lng?: number): Promise<MapsBusiness[]> {
        if (!this.apiKey) {
            console.warn('[GoogleMapsService] API Key is missing. Returning mock data.');
            return this.getMockData(query);
        }

        try {
            // 1. Search for places
            let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}&language=tr`;

            if (lat && lng) {
                // Add location bias (radius in meters)
                searchUrl += `&location=${lat},${lng}&radius=50000`;
            }
            const searchResponse = await axios.get(searchUrl);

            if (searchResponse.data.status !== 'OK' && searchResponse.data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Places API Error: ${searchResponse.data.status}`);
            }

            const results = searchResponse.data.results || [];

            // Map basic results
            const businesses: MapsBusiness[] = results.map((item: any) => ({
                name: item.name,
                address: item.formatted_address,
                latitude: item.geometry.location.lat,
                longitude: item.geometry.location.lng,
                place_id: item.place_id,
                rating: item.rating,
                user_ratings_total: item.user_ratings_total
            }));

            return businesses;
        } catch (error) {
            console.error('[GoogleMapsService] Search Error:', error);
            throw error;
        }
    }

    async getPlaceDetails(placeId: string): Promise<Partial<MapsBusiness>> {
        if (!this.apiKey) return {};

        try {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,geometry,rating&key=${this.apiKey}&language=tr`;
            const response = await axios.get(detailUrl);
            const result = response.data.result;

            return {
                name: result.name,
                address: result.formatted_address,
                phone: result.formatted_phone_number,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng
            };
        } catch (error) {
            console.error('[GoogleMapsService] Detail Error:', error);
            throw error;
        }
    }

    private getMockData(query: string): MapsBusiness[] {
        // Genişletilmiş örnek veriler (API Key yoksa çalışır)
        const mocks: MapsBusiness[] = [
            {
                name: "Gold Güzellik Merkezi",
                address: "Atatürk Blv. No:123, Çankaya/Ankara",
                phone: "0312 444 00 11",
                latitude: 39.9208,
                longitude: 32.8541,
                place_id: "mock_1"
            },
            {
                name: "Karizma Erkek Kuaförü",
                address: "Bahçelievler 7. Cadde No:45, Ankara",
                phone: "0312 212 00 22",
                latitude: 39.9167,
                longitude: 32.8250,
                place_id: "mock_2"
            },
            {
                name: "Nurten Bayan Kuaförü",
                address: "Kızılay Karanfil Sokak No:12, Ankara",
                phone: "0312 417 00 33",
                latitude: 39.9195,
                longitude: 32.8530,
                place_id: "mock_3"
            },
            {
                name: "Elegance Salon",
                address: "Nişantaşı Vali Konağı Cad. No:88, İstanbul",
                phone: "0212 233 00 44",
                latitude: 41.0515,
                longitude: 28.9910,
                place_id: "mock_4"
            },
            {
                name: "Pırlanta Güzellik Salonu",
                address: "Alsancak Gül Sokak No:5, İzmir",
                phone: "0232 421 00 55",
                latitude: 38.4350,
                longitude: 27.1420,
                place_id: "mock_5"
            }
        ];

        const q = query.toLowerCase();
        return mocks.filter(m =>
            m.name.toLowerCase().includes(q) ||
            m.address.toLowerCase().includes(q) ||
            q.length < 3
        );
    }
}

export default new GoogleMapsService();
