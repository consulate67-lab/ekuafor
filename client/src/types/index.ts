export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'super_admin' | 'company_admin' | 'staff' | 'customer';
    company_id?: number;
    photo?: string | null;
    department_id?: number | null;
    department_name?: string | null;
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
    slot_interval?: number;

    // Durum
    is_active?: boolean;
    is_verified?: boolean;
    board_key?: string;
    admin_key?: string;
    genders?: string[];

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
    department_id?: number | null;
    department_name?: string | null;
}

export interface Package {
    id?: number;
    company_id: number;
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    is_active?: boolean;
    staff_id?: number | null;
    staff_first_name?: string | null;
    staff_last_name?: string | null;
    department_id?: number | null;
    department_name?: string | null;
    services?: (Service & { staff_id?: number | null; staff_name?: string })[];
}

export interface PackageServiceItem {
    service_id: number;
    staff_id?: number | null;
    department_id?: number | null;
}

export interface Appointment {
    id?: number;
    company_id: number;
    customer_id?: number;
    service_id: number;
    service_ids?: number[];
    package_id?: number;
    staff_id?: number;
    duration_minutes?: number;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'cancelled' | 'completed';
    notes?: string;
    price?: number;
    customer_name?: string;
    customer_phone?: string;
    rating?: number;
    comment?: string;
    service_name?: string;
    package_name?: string;
    staff_name?: string;
    company_name?: string;
    services?: Array<{
        id: number;
        aps_id?: number;
        service_id?: number;
        name?: string;
        price: number;
        duration_minutes: number;
        status: string;
        start_time?: string;
        end_time?: string;
        staff_id?: number;
        service_staff_name?: string;
    }>;
}
