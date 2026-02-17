export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'super_admin' | 'company_admin' | 'staff' | 'customer';
    company_id?: number;
    created_at: string;
}

export interface Company {
    id?: number;
    name: string;
    description?: string;
    phone?: string;
    email?: string;
    website?: string;

    // Adres
    address_line?: string;
    province_id?: number;
    province_name?: string;
    district_id?: number;
    district_name?: string;
    neighborhood_id?: number;
    neighborhood_name?: string;
    postal_code?: string;

    // Konum
    latitude?: number;
    longitude?: number;

    // Banka
    bank_name?: string;
    bank_branch?: string;
    iban?: string;
    account_holder_name?: string;

    // Ödeme
    commission_rate?: number;
    payment_enabled?: boolean;

    // Çalışma Saatleri
    work_start_time?: string;
    work_end_time?: string;

    // Durum
    is_active?: boolean;
    is_verified?: boolean;
    board_key?: string;

    created_at?: string;
    updated_at?: string;
}

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

export interface CompanyEmployee {
    id: number;
    company_id: number;
    user_id: number;
    role: 'owner' | 'manager' | 'staff';
    is_active: boolean;
    created_at: string;
    // İlişkili kullanıcı bilgileri
    user?: User;
}

export interface Service {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
}

export interface Appointment {
    id?: number;
    company_id: number;
    customer_id?: number;
    service_id: number;
    staff_id?: number;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'cancelled' | 'completed';
    notes?: string;
    price?: number;
    customer_name?: string;
    service_name?: string;
}
