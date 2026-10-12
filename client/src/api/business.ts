import client, { unwrap } from './client';
import type { Appointment, User } from '../types';

export type Period = 'today' | 'week' | 'month' | 'year';
export type PaymentMethod = 'cash' | 'card' | 'transfer';

/** Sunucudaki `EXPENSE_CATEGORIES` ile aynı sırada. */
export const EXPENSE_CATEGORIES = {
    rent: { label: 'Kira', icon: '🏠' },
    salary: { label: 'Maaş', icon: '👥' },
    supplies: { label: 'Malzeme', icon: '🧴' },
    utilities: { label: 'Fatura', icon: '💡' },
    marketing: { label: 'Reklam', icon: '📣' },
    tax: { label: 'Vergi', icon: '🧾' },
    other: { label: 'Diğer', icon: '📦' },
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export interface Expense {
    id: number;
    amount: string | number;
    description: string;
    category: ExpenseCategory | null;
    expense_date: string;
    created_by: number | null;
    created_by_name: string | null;
}

export interface Summary {
    total_appointments: number;
    total_booked_value: number;
    actual_collected: number;
    total_expenses: number;
    /** Yalnızca personel için: tahsilat × prim oranı */
    commission?: number;
}

export interface StaffStat {
    staff_id: number;
    staff_name: string;
    count: number;
    total_booked_value: number;
    actual_collected: number;
    actual_commission: number;
}

export interface CodeLoginResult {
    type: 'admin' | 'staff' | 'board';
    token?: string;
    user?: User;
    board_key?: string;
    is_license_expired?: boolean;
}

export const authApi = {
    login: async (email: string, password: string) =>
        unwrap<{ user: User; token: string }>(await client.post('/auth/login', { email: email.toLowerCase().trim(), password })),
    /** Yönetici anahtarı, personel kodu veya board anahtarı. */
    codeLogin: async (code: string) =>
        unwrap<CodeLoginResult>(await client.post('/companies/check-code', { code: code.trim() })),
};

export const businessAppointmentsApi = {
    /** Yönetici firmanın tüm randevularını, personel kendisine atanan ve atanmamış randevuları alır. */
    list: async (params: { start_date: string; end_date?: string; status?: Appointment['status'] }) =>
        unwrap<Appointment[]>(await client.get('/appointments', { params })) || [],
    setStatus: async (id: number, status: Appointment['status'], extra?: { price?: number; payment_method?: PaymentMethod }) =>
        unwrap<Appointment>(await client.patch(`/appointments/${id}/status`, { status, ...extra })),
};

export const expensesApi = {
    list: async (period: Period, localDate: string) =>
        unwrap<Expense[]>(await client.get('/expenses', { params: { period, local_date: localDate } })) || [],
    create: async (expense: { amount: number; description: string; category: ExpenseCategory; date: string }) =>
        unwrap<Expense>(await client.post('/expenses', expense)),
    remove: async (id: number) => {
        await client.delete(`/expenses/${id}`);
    },
};

export const reportsApi = {
    summary: async (period: Period, localDate: string) =>
        unwrap<Summary>(await client.get('/reports/employee-stats', { params: { period, local_date: localDate } })),
    staff: async (period: Period, localDate: string) =>
        (unwrap<{ staffStats: StaffStat[] }>(await client.get('/reports/company-detailed', { params: { period, local_date: localDate } }))?.staffStats) || [],
};
