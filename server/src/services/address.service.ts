import axios from 'axios';
import redis from '../config/redis';

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
    private CACHE_TTL = 86400; // 24 hours

    /**
     * Tüm illeri getir
     */
    async getProvinces(): Promise<Province[]> {
        const cacheKey = 'address:provinces';
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        try {
            const response = await axios.get(`${TURKEY_API_BASE}/provinces`);
            const data = response.data.data || [];
            if (redis && data.length > 0) {
                await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
            }
            return data;
        } catch (error) {
            console.error('Error fetching provinces:', error);
            throw new Error('İller yüklenirken hata oluştu');
        }
    }

    /**
     * Belirli bir ili getir
     */
    async getProvinceById(id: number): Promise<Province | null> {
        const cacheKey = `address:province:${id}`;
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        try {
            const response = await axios.get(`${TURKEY_API_BASE}/provinces/${id}`);
            const data = response.data.data || null;
            if (redis && data) {
                await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
            }
            return data;
        } catch (error) {
            console.error(`Error fetching province ${id}:`, error);
            return null;
        }
    }

    /**
     * İl adına göre il getir
     */
    async getProvinceByName(name: string): Promise<Province | null> {
        const provinces = await this.getProvinces();
        return provinces.find((p: Province) =>
            p.name.toLowerCase() === name.toLowerCase()
        ) || null;
    }

    /**
     * Belirli bir ilin ilçelerini getir
     */
    async getDistricts(provinceId: number): Promise<District[]> {
        const cacheKey = `address:districts:${provinceId}`;
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        try {
            const response = await axios.get(`${TURKEY_API_BASE}/districts`, {
                params: { provinceId }
            });
            const data = response.data.data || [];
            if (redis && data.length > 0) {
                await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
            }
            return data;
        } catch (error) {
            console.error(`Error fetching districts for province ${provinceId}:`, error);
            throw new Error('İlçeler yüklenirken hata oluştu');
        }
    }

    /**
     * Belirli bir ilçenin mahallelerini getir
     */
    async getNeighborhoods(provinceId: number, districtId: number): Promise<Neighborhood[]> {
        const cacheKey = `address:neighborhoods:${districtId}`;
        if (redis) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }

        try {
            const response = await axios.get(`${TURKEY_API_BASE}/neighborhoods`, {
                params: { districtId }
            });
            const data = response.data.data || [];
            if (redis && data.length > 0) {
                await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
            }
            return data;
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
            return provinces[0] || null;
        } catch (error) {
            console.error('Error finding nearest province:', error);
            return null;
        }
    }
}

export default new AddressService();
