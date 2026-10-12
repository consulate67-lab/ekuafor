export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role: 'super_admin' | 'company_admin' | 'admin' | 'staff' | 'customer';
    company_id?: number;
    photo?: string | null;
    department_id?: number | null;
    department_name?: string | null;
    quantity?: number | null;
    unit?: string | null;
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
    city?: string;
    district?: string;
    neighborhood?: string;
    postal_code?: string;

    // Konum
    latitude?: number;
    longitude?: number;

    // Banka
    bank_name?: string;
    bank_branch?: string;
    iban?: string;
    bank_iban?: string;
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
    company_type?: 'ÜST FİRMA' | 'ASIL' | 'ŞUBE';
    main_company_id?: number | null;
    booking_flow?: string;
    staff_label?: string;
    service_label?: string;
    sms_enabled?: boolean;
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
    quantity?: number | null;
    unit?: string | null;
    photo?: string | null;
    booking_mode?: BookingMode;
    duration_options?: number[] | null;
    resource_ids?: number[];
}

/** staff: çalışanın zamanı · resource: saha/kulvar/oda · class: kapasiteli grup seansı */
export type BookingMode = 'staff' | 'resource' | 'class';

export interface Resource {
    id: number;
    name: string;
    resource_type: string;
    is_active: boolean;
    display_order: number;
    service_ids?: number[];
}

export interface ClassSession {
    id: number;
    service_id: number;
    service_name: string;
    price: string | number;
    staff_id: number | null;
    staff_name: string | null;
    resource_id: number | null;
    resource_name: string | null;
    session_date: string;
    start_time: string;
    end_time: string;
    capacity: number;
    status: 'scheduled' | 'cancelled';
    series_id: string | null;
    booked: number;
    remaining: number;
}

export interface AvailabilitySlot {
    time: string;
    available: boolean;
    staff_ids?: number[];
    resource_ids?: number[];
}

export interface Availability {
    mode: BookingMode;
    date: string;
    duration: number;
    slots: AvailabilitySlot[];
}

export interface Appointment {
    id?: number;
    company_id: number;
    customer_id?: number;
    service_id: number;
    service_ids?: number[];
    staff_id?: number;
    resource_id?: number | null;
    resource_name?: string | null;
    class_session_id?: number | null;
    party_size?: number;
    duration_minutes?: number;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'approved' | 'cancelled' | 'completed';
    notes?: string;
    price?: number;
    payment_status?: 'unpaid' | 'pending' | 'paid' | 'failed';
    payment_method?: 'cash' | 'card';
    customer_name?: string;
    customer_phone?: string;
    rating?: number;
    comment?: string;
    technical_notes?: string;
    service_name?: string;
    staff_name?: string;
    company_name?: string;
    original_price?: number;
    collected_price?: number;
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
    is_local?: boolean;
    is_updated_locally?: boolean;
}

export interface Expense {
    id: number;
    description: string;
    amount: number;
    category?: string;
    date: string;
    created_at?: string;
    is_local?: boolean;
}
