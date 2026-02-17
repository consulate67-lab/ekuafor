import axios from 'axios';
import { MapsBusiness } from './google-maps.service';

class YandexMapsService {
    private apiKey: string | undefined;

    constructor() {
        // Yandex Search API Key (Organization Search API)
        this.apiKey = process.env.YANDEX_MAPS_API_KEY;
    }

    async searchBusinesses(query: string, lat?: number, lng?: number): Promise<MapsBusiness[]> {
        if (!this.apiKey) {
            console.warn('[YandexMapsService] API Key is missing. Returning empty or mock.');
            return [];
        }

        try {
            // Yandex Organizations Search API
            // type=biz (business), lang=tr_TR
            let url = `https://search-maps.yandex.ru/v1/?text=${encodeURIComponent(query)}&key=${this.apiKey}&lang=tr_TR&type=biz&results=10`;

            if (lat && lng) {
                // ll: center longitude,latitude
                // spn: span of the area (approx 0.1 degree for city bias)
                url += `&ll=${lng},${lat}&spn=0.1,0.1`;
            }

            const response = await axios.get(url);
            const features = response.data.features || [];

            return features.map((f: any) => {
                const props = f.properties.CompanyMetaData;
                const coords = f.geometry.coordinates; // [lng, lat]

                return {
                    name: props.name,
                    address: props.address,
                    phone: props.Phones?.[0]?.formatted,
                    latitude: coords[1],
                    longitude: coords[0],
                    place_id: `yandex_${f.properties.id}`,
                    rating: props.Hours?.text ? undefined : undefined // Yandex schema is complex, mapping basic
                };
            });
        } catch (error) {
            console.error('[YandexMapsService] Search Error:', error);
            return [];
        }
    }
}

export default new YandexMapsService();
