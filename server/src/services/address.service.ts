import axios from 'axios';

const TURKEY_API_BASE = process.env.TURKEY_API_BASE_URL || 'https://turkiyeapi.dev/api/v1';

export interface Province {
    id: number;
    name: string;
    population: number;
    area: number;
    altitude: number;
    areaCode: string[];
    isMetropolitan: boolean;
}

export interface District {
    id: number;
    name: string;
    population: number;
    area: number;
}

export interface Neighborhood {
    id: number;
    name: string;
    population: number;
}

class AddressService {
    /**
     * Tüm illeri getir
     */
    async getProvinces(): Promise<Province[]> {
        try {
            const response = await axios.get(`${TURKEY_API_BASE}/provinces`);
            return response.data.data || [];
        } catch (error) {
            console.error('Error fetching provinces:', error);
            throw new Error('İller yüklenirken hata oluştu');
        }
    }

    /**
     * Belirli bir ili getir
     */
    async getProvinceById(id: number): Promise<Province | null> {
        try {
            const response = await axios.get(`${TURKEY_API_BASE}/provinces/${id}`);
            return response.data.data || null;
        } catch (error) {
            console.error(`Error fetching province ${id}:`, error);
            return null;
        }
    }

    /**
     * İl adına göre il getir
     */
    async getProvinceByName(name: string): Promise<Province | null> {
        try {
            const response = await axios.get(`${TURKEY_API_BASE}/provinces`, {
                params: { name }
            });
            const provinces = response.data.data || [];
            return provinces.find((p: Province) =>
                p.name.toLowerCase() === name.toLowerCase()
            ) || null;
        } catch (error) {
            console.error(`Error fetching province by name ${name}:`, error);
            return null;
        }
    }

    /**
     * Belirli bir ilin ilçelerini getir
     */
    async getDistricts(provinceId: number): Promise<District[]> {
        try {
            const response = await axios.get(`${TURKEY_API_BASE}/districts`, {
                params: { provinceId }
            });
            return response.data.data || [];
        } catch (error) {
            console.error(`Error fetching districts for province ${provinceId}:`, error);
            throw new Error('İlçeler yüklenirken hata oluştu');
        }
    }

    /**
     * Belirli bir ilçenin mahallelerini getir
     */
    async getNeighborhoods(provinceId: number, districtId: number): Promise<Neighborhood[]> {
        try {
            const response = await axios.get(`${TURKEY_API_BASE}/neighborhoods`, {
                params: { districtId }
            });
            return response.data.data || [];
        } catch (error) {
            console.error(`Error fetching neighborhoods:`, error);
            throw new Error('Mahalleler yüklenirken hata oluştu');
        }
    }

    /**
     * Koordinatlara göre en yakın ili bul (basit hesaplama)
     */
    async findNearestProvince(lat: number, lng: number): Promise<Province | null> {
        try {
            const provinces = await this.getProvinces();
            // Not: API'den koordinat bilgisi gelmiyorsa, 
            // ayrı bir koordinat veritabanı kullanmanız gerekebilir
            return provinces[0] || null;
        } catch (error) {
            console.error('Error finding nearest province:', error);
            return null;
        }
    }
}

export default new AddressService();
