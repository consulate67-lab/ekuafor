import { Service } from '../types';

// LocalStorage Keys
const KEYS = {
    USERS: 'saloon_users',
    SERVICES: 'saloon_services',
    COMPANIES: 'saloon_companies',
    APPOINTMENTS: 'saloon_appointments',
    TOKEN: 'token'
};

// Initial Data
const initializeDB = () => {
    // Users
    let users = [];
    try {
        users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch (e) { users = []; }

    // Admin kullanıcısı yoksa ekle veya güncelle
    const adminIndex = users.findIndex((u: any) => u.email === 'admin@saloon.com');
    if (adminIndex === -1) {
        users.push({
            id: 1,
            email: 'admin@saloon.com',
            password: 'admin',
            first_name: 'Saloon',
            last_name: 'Super Admin',
            role: 'super_admin',
            company_id: 1,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    } else {
        // Varolan admin kullanıcısının rolünü güncelle (Migration fix)
        if (users[adminIndex].role !== 'super_admin') {
            users[adminIndex].role = 'super_admin';
            localStorage.setItem(KEYS.USERS, JSON.stringify(users));
        }
    }


    if (!localStorage.getItem(KEYS.SERVICES) || JSON.parse(localStorage.getItem(KEYS.SERVICES) || '[]').length === 0) {
        localStorage.setItem(KEYS.SERVICES, JSON.stringify([
            { id: 101, company_id: 1, name: 'Saç Kesimi', duration_minutes: 30, price: 150, is_active: true },
            { id: 102, company_id: 1, name: 'Sakal Tıraşı', duration_minutes: 20, price: 80, is_active: true },
            { id: 103, company_id: 1, name: 'Saç & Sakal', duration_minutes: 50, price: 200, is_active: true }
        ]));
    }

    if (!localStorage.getItem(KEYS.USERS) || JSON.parse(localStorage.getItem(KEYS.USERS) || '[]').length <= 1) {
        const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
        if (!users.find((u: any) => u.id === 2)) {
            users.push({
                id: 2,
                email: 'ahmet@saloon.com',
                password: '123',
                first_name: 'Ahmet',
                last_name: 'Yılmaz',
                role: 'staff',
                company_id: 1,
                created_at: new Date().toISOString()
            });
            localStorage.setItem(KEYS.USERS, JSON.stringify(users));
        }
    }

    // --- FORCED USER CREATION (Run this check always) ---
    // Re-read fresh users list
    let currentUsers = [];
    try {
        currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch (e) { currentUsers = []; }

    let usersChanged = false;

    // SUPER ADMIN SELIM
    if (!currentUsers.find((u: any) => u.email === 'selim@sallon.com')) {
        currentUsers.push({
            id: 99,
            email: 'selim@sallon.com',
            password: 'Continue677',
            first_name: 'Selim',
            last_name: 'Owner',
            role: 'super_admin',
            company_id: null,
            created_at: new Date().toISOString()
        });
        usersChanged = true;
    }

    // SUPER ADMIN SELIM (CORRECT SPELLING)
    if (!currentUsers.find((u: any) => u.email === 'selim@saloon.com')) {
        currentUsers.push({
            id: 100,
            email: 'selim@saloon.com',
            password: 'Continue677',
            first_name: 'Selim',
            last_name: 'Öz',
            role: 'super_admin',
            company_id: null,
            created_at: new Date().toISOString()
        });
        usersChanged = true;
    }

    // Add user selim2 if not exists
    if (!currentUsers.find((u: any) => u.email === 'selim2@korgun.com.tr')) {
        currentUsers.push({
            id: 3,
            email: 'selim2@korgun.com.tr',
            password: '123',
            first_name: 'Selim',
            last_name: 'Korgun',
            role: 'company_admin',
            company_id: 1,
            created_at: new Date().toISOString()
        });
        usersChanged = true;
    }

    if (usersChanged) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(currentUsers));
    }

    if (!localStorage.getItem(KEYS.APPOINTMENTS)) {
        localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify([]));
    }

    let companies = [];
    try {
        companies = JSON.parse(localStorage.getItem(KEYS.COMPANIES) || '[]');
    } catch (e) { companies = []; }

    // Ensure Default Company Exists
    if (!companies.find((c: any) => c.id === 1)) {
        companies.push({
            id: 1,
            name: 'Örnek Kuaför',
            description: 'Varsayılan Firma',
            work_start_time: '09:00',
            work_end_time: '20:00',
            address_line: 'Örnek Mahallesi',
            city: 'İstanbul',
            district: 'Merkez'
        });
        localStorage.setItem(KEYS.COMPANIES, JSON.stringify(companies));
    }
    // Data Migration / Sanitization
    try {
        if (Array.isArray(companies)) {
            let changed = false;
            companies = companies.map((c: any) => {
                if (!c.work_start_time) {
                    c.work_start_time = '09:00';
                    c.work_end_time = '20:00';
                    changed = true;
                }
                return c;
            });
            if (changed) {
                localStorage.setItem(KEYS.COMPANIES, JSON.stringify(companies));
            }
        }
    } catch (e) {
        console.error('Data migration error', e);
    }
};

initializeDB();

// Helpers
const getTable = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setTable = (key: string, data: any[]) => localStorage.setItem(key, JSON.stringify(data));
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Handlers
export const mockHandlers = {
    // Health Check - For Login Page Connectivity Test
    'GET /health': async () => {
        return { success: true, status: 'ok' };
    },

    // Auth
    'POST /auth/login': async (data: any) => {
        const users = getTable(KEYS.USERS);
        const user = users.find((u: any) => u.email === data.email && u.password === data.password); // Simple password check

        if (!user) throw { response: { data: { error: 'Email veya şifre hatalı' } } };

        const token = 'mock-jwt-token-' + user.id;
        return { success: true, data: { user, token } };
    },

    'POST /auth/register': async (data: any) => {
        const users = getTable(KEYS.USERS);
        if (users.find((u: any) => u.email === data.email)) {
            throw { response: { data: { error: 'Bu email zaten kayıtlı' } } };
        }

        const newUser = {
            id: users.length + 1,
            ...data,
            role: data.role || 'customer',
            created_at: new Date().toISOString()
        };

        // Eğer company_id gelmediyse ve rol admin ise varsayılan firmaya bağla (Demo kolaylığı)
        if (!newUser.company_id && newUser.role.includes('admin')) {
            newUser.company_id = 1;
        }

        users.push(newUser);
        setTable(KEYS.USERS, users);

        const token = 'mock-jwt-token-' + newUser.id;
        return { success: true, data: { user: newUser, token } };
    },

    'GET /auth/me': async (headers: any) => {
        // Mock token validation
        // Handle case-insensitive headers
        const authHeader = headers?.Authorization || headers?.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) throw { response: { status: 401, data: { error: 'No token' } } };

        // Extract user ID from fake token
        const userId = parseInt(token.split('-').pop());
        const users = getTable(KEYS.USERS);
        const user = users.find((u: any) => u.id === userId);

        if (!user) throw { response: { status: 401, data: { error: 'Invalid token user' } } };

        return { success: true, data: user };
    },

    'POST /auth/update-company': async (data: any, headers: any) => {
        const meRes = await mockHandlers['GET /auth/me'](headers);
        const user = meRes.data;

        const users = getTable(KEYS.USERS);
        const userIndex = users.findIndex((u: any) => u.id === user.id);

        if (userIndex === -1) throw { response: { data: { error: 'User not found' } } };

        users[userIndex].company_id = data.company_id;
        setTable(KEYS.USERS, users);

        return { success: true, data: { user: users[userIndex], token: 'mock-jwt-token-' + user.id } };
    },

    // Services
    'GET /services': async (params: any, headers: any) => {
        let companyId;

        // Public Access check via query param
        if (params && params.company_id) {
            companyId = Number(params.company_id);
        } else {
            // Protected Access check via auth
            try {
                const meRes = await mockHandlers['GET /auth/me'](headers);
                companyId = meRes.data.company_id;
            } catch (e) {
                // If no token and no company_id param, return empty or error
                // returning empty for safety
                return { success: true, data: [] };
            }
        }

        if (!companyId) return { success: true, data: [] };

        const services = getTable(KEYS.SERVICES);
        const companyServices = services.filter((s: Service) => s.company_id === companyId && s.is_active !== false);

        return { success: true, data: companyServices };
    },

    'POST /services': async (data: any, headers: any) => {
        const meRes = await mockHandlers['GET /auth/me'](headers);
        const user = meRes.data;

        if (!user.company_id) throw { response: { data: { error: 'Firma bilgisi eksik' } } };

        const services = getTable(KEYS.SERVICES);
        const newService = {
            id: Date.now(),
            company_id: user.company_id,
            ...data,
            is_active: true
        };

        services.push(newService);
        setTable(KEYS.SERVICES, services);

        return { success: true, data: newService };
    },

    'PUT /services/:id': async (id: number, data: any, _headers: any) => {
        const services = getTable(KEYS.SERVICES);
        const index = services.findIndex((s: Service) => s.id === id);

        if (index === -1) throw { response: { status: 404, data: { error: 'Hizmet bulunamadı' } } };

        services[index] = { ...services[index], ...data };
        setTable(KEYS.SERVICES, services);

        return { success: true, data: services[index] };
    },

    'DELETE /services/:id': async (id: number, _headers: any) => {
        const services = getTable(KEYS.SERVICES);
        const index = services.findIndex((s: Service) => s.id === id);

        if (index === -1) throw { response: { status: 404, data: { error: 'Hizmet bulunamadı' } } };

        // Soft delete or hard delete? Let's do soft
        services[index].is_active = false;
        setTable(KEYS.SERVICES, services);

        return { success: true, message: 'Silindi' };
    },

    // Users (Staff)
    'GET /users': async (params: any, headers: any) => {
        let companyId;

        // Public Access check via query param
        if (params && params.company_id) {
            companyId = Number(params.company_id);
        } else {
            try {
                const meRes = await mockHandlers['GET /auth/me'](headers);
                companyId = meRes.data.company_id;
            } catch (e) {
                return { success: true, data: [] };
            }
        }

        if (!companyId) return { success: true, data: [] };

        const users = getTable(KEYS.USERS);
        // Use non-strict equality for safety with ID types (string vs number)
        let companyUsers = users.filter((u: any) => u.company_id == companyId && (u.role === 'staff' || u.role === 'company_admin'));

        // Failsafe for Company 1 (Default Demo)
        if (companyId == 1 && companyUsers.length === 0) {
            const defaultStaff = {
                id: 2,
                email: 'ahmet@saloon.com',
                password: '123',
                first_name: 'Ahmet',
                last_name: 'Yılmaz',
                role: 'staff',
                company_id: 1,
                created_at: new Date().toISOString()
            };
            const allUsers = getTable(KEYS.USERS);
            if (!allUsers.find((u: any) => u.id == 2)) {
                allUsers.push(defaultStaff);
                setTable(KEYS.USERS, allUsers);
                companyUsers = [defaultStaff];
            }
        }

        // Remove sensitive data like password
        const safeUsers = companyUsers.map(({ password, ...u }: any) => u);

        return { success: true, data: safeUsers };
    },

    // Appointments
    'GET /appointments': async (params: any, headers: any) => {
        let companyId;

        // Public Access check via query param
        if (params && params.company_id) {
            companyId = Number(params.company_id);
        } else {
            try {
                const meRes = await mockHandlers['GET /auth/me'](headers);
                companyId = meRes.data.company_id;
            } catch (e) {
                return { success: true, data: [] };
            }
        }

        if (!companyId) return { success: true, data: [] };

        const appointments = getTable(KEYS.APPOINTMENTS);
        const services = getTable(KEYS.SERVICES);

        // Filter by company and join service name
        const companyAppointments = appointments
            .filter((a: any) => a.company_id === companyId)
            .map((a: any) => {
                const service = services.find((s: Service) => s.id === a.service_id);
                return { ...a, service_name: service ? service.name : 'Silinmiş Hizmet' };
            });

        return { success: true, data: companyAppointments };
    },

    'POST /appointments': async (data: any, headers: any) => {
        // Allow public booking without auth check if it's for creation
        // But we should validate company_id exists in data

        if (!data.company_id) throw { response: { data: { error: 'Firma bilgisi eksik' } } };

        const appointments = getTable(KEYS.APPOINTMENTS);
        const services = getTable(KEYS.SERVICES);
        const service = services.find((s: Service) => s.id === data.service_id);

        if (!service) throw { response: { data: { error: 'Hizmet bulunamadı' } } };

        // Conflict Check Logic
        const timeToMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const newStart = timeToMinutes(data.start_time);
        const duration = service.duration_minutes;
        const newEnd = newStart + duration;
        const endTimeStr = `${String(Math.floor(newEnd / 60)).padStart(2, '0')}:${String(newEnd % 60).padStart(2, '0')}`;

        // Check conflicts
        const conflict = appointments.some((a: any) => {
            if (a.company_id !== data.company_id) return false;
            if (a.staff_id !== data.staff_id) return false;
            if (a.appointment_date !== data.appointment_date) return false;
            if (a.status === 'cancelled') return false;

            const existStart = timeToMinutes(a.start_time);
            const existEnd = timeToMinutes(a.end_time);

            return (newStart < existEnd && newEnd > existStart);
        });

        if (conflict) {
            throw { response: { status: 409, data: { error: 'Seçilen saat dolu' } } };
        }

        const newAppointment = {
            id: Date.now(),
            ...data,
            end_time: endTimeStr, // Store calculated end time
            service_name: service.name,
            // If user is guest/public, status is pending. If admin creates, approved.
            status: 'pending',
            created_at: new Date().toISOString()
        };

        // Check if creator is admin to auto-approve
        try {
            const meRes = await mockHandlers['GET /auth/me'](headers);
            if (meRes.data.role === 'company_admin' || meRes.data.role === 'super_admin') {
                newAppointment.status = 'approved';
            }
        } catch (e) {
            // public user, keep pending
        }

        appointments.push(newAppointment);
        setTable(KEYS.APPOINTMENTS, appointments);

        return { success: true, data: newAppointment };
    },

    'PATCH /appointments/:id/status': async (id: number, data: any, _headers: any) => {
        const appointments = getTable(KEYS.APPOINTMENTS);
        const index = appointments.findIndex((a: any) => a.id === id);

        if (index === -1) throw { response: { status: 404, data: { error: 'Randevu bulunamadı' } } };

        appointments[index].status = data.status;
        setTable(KEYS.APPOINTMENTS, appointments);

        return { success: true, data: appointments[index] };
    },

    // Companies
    'GET /companies': async () => {
        const companies = getTable(KEYS.COMPANIES);
        return { success: true, data: companies };
    },

    'GET /companies/:id': async (id: number) => {
        const companies = getTable(KEYS.COMPANIES);
        let company = companies.find((c: any) => c.id === id);

        // Failsafe: If requesting ID 1 (Default) and it doesn't exist, create it live.
        if (id === 1 && !company) {
            const defaultComp = {
                id: 1,
                name: 'Örnek Kuaför',
                description: 'Varsayılan Firma',
                work_start_time: '09:00',
                work_end_time: '20:00',
                address_line: 'Örnek Mahallesi',
                city: 'İstanbul',
                district: 'Merkez'
            };
            companies.push(defaultComp);
            setTable(KEYS.COMPANIES, companies);
            company = defaultComp;
        }

        if (!company) throw { response: { status: 404, data: { error: 'Firma bulunamadı' } } };
        if (!company) throw { response: { status: 404, data: { error: 'Firma bulunamadı' } } };
        return { success: true, data: company };
    },

    'DELETE /companies/:id': async (id: number) => {
        let companies = getTable(KEYS.COMPANIES);
        const index = companies.findIndex((c: any) => c.id === id);

        if (index === -1) throw { response: { status: 404, data: { error: 'Firma bulunamadı' } } };

        companies.splice(index, 1);
        setTable(KEYS.COMPANIES, companies);

        return { success: true, message: 'Firma silindi' };
    },

    'POST /companies': async (data: any) => {
        const companies = getTable(KEYS.COMPANIES);
        const newCompany = { id: Date.now(), ...data, created_at: new Date().toISOString() };
        companies.push(newCompany);
        setTable(KEYS.COMPANIES, companies);
        return { success: true, data: newCompany };
    },

    'PUT /companies/:id': async (id: number, data: any) => {
        const companies = getTable(KEYS.COMPANIES);
        const index = companies.findIndex((c: any) => c.id === id);
        if (index === -1) throw { response: { status: 404, data: { error: 'Firma bulunamadı' } } };

        companies[index] = { ...companies[index], ...data, updated_at: new Date().toISOString() };
        setTable(KEYS.COMPANIES, companies);
        return { success: true, data: companies[index] };
    },

    'GET /companies/:id/employees': async (_id: number) => {
        // Mock employees for now since we removed the UI management but the page might still request it initially
        // returns empty or some mock data
        return { success: true, data: [] };
    }
};

// Main Mock MockAdapter
export const mockAdapter = async (config: any) => {
    await delay(150); // Simulate network latency

    const { url, data, headers } = config;
    const method = config.method ? config.method.toLowerCase() : 'get'; // Normalize method
    const body = data ? (typeof data === 'string' ? JSON.parse(data) : data) : {};

    // Parse Path and Params
    let path = '';
    const params: any = {};
    try {
        const urlObj = new URL(url, window.location.origin);
        path = urlObj.pathname;
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
    } catch (e) {
        path = url;
    }

    console.log(`[MockServer] REQUEST: ${method.toUpperCase()} ${path}`, { body, params });

    try {
        let responseData: any = null;

        // --- Route Matching Logic ---

        // AUTH
        if (path.includes('/auth/login') && method === 'post') responseData = await mockHandlers['POST /auth/login'](body);
        else if (path.includes('/auth/register') && method === 'post') responseData = await mockHandlers['POST /auth/register'](body);
        else if (path.includes('/auth/me') && method === 'get') responseData = await mockHandlers['GET /auth/me'](headers);
        else if (path.includes('/auth/update-company') && (method === 'post' || method === 'put')) responseData = await mockHandlers['POST /auth/update-company'](body, headers);
        else if (path.includes('/health') && method === 'get') responseData = await mockHandlers['GET /health']();

        // SERVICES
        else if (path.endsWith('/services') && method === 'get') responseData = await mockHandlers['GET /services'](params, headers);
        else if (path.endsWith('/services') && method === 'post') responseData = await mockHandlers['POST /services'](body, headers);
        else if (path.match(/\/services\/\d+$/) && method === 'put') {
            const id = parseInt(path.split('/').pop()!);
            responseData = await mockHandlers['PUT /services/:id'](id, body, headers);
        }
        else if (path.match(/\/services\/\d+$/) && method === 'delete') {
            const id = parseInt(path.split('/').pop()!);
            responseData = await mockHandlers['DELETE /services/:id'](id, headers);
        }

        // USERS (STAFF)
        else if (path.endsWith('/users') && method === 'get') responseData = await mockHandlers['GET /users'](params, headers);

        // COMPANIES
        else if (path.endsWith('/companies') && method === 'get') responseData = await mockHandlers['GET /companies']();
        else if (path.endsWith('/companies') && method === 'post') responseData = await mockHandlers['POST /companies'](body);
        else if (path.match(/\/companies\/\d+$/) && method === 'get') {
            const id = parseInt(path.split('/').pop()!);
            responseData = await mockHandlers['GET /companies/:id'](id);
        }
        else if (path.match(/\/companies\/\d+$/) && method === 'put') {
            const id = parseInt(path.split('/').pop()!);
            responseData = await mockHandlers['PUT /companies/:id'](id, body);
        }
        else if (path.match(/\/companies\/\d+$/) && method === 'delete') {
            const id = parseInt(path.split('/').pop()!);
            responseData = await mockHandlers['DELETE /companies/:id'](id);
        }
        else if (path.match(/\/companies\/\d+\/employees$/) && method === 'get') {
            const parts = path.split('/');
            const id = parseInt(parts[parts.length - 2]);
            responseData = await mockHandlers['GET /companies/:id/employees'](id);
        }

        // APPOINTMENTS
        else if (path.endsWith('/appointments') && method === 'get') responseData = await mockHandlers['GET /appointments'](params, headers);
        else if (path.endsWith('/appointments') && method === 'post') responseData = await mockHandlers['POST /appointments'](body, headers);
        else if (path.match(/\/appointments\/\d+\/status$/) && method === 'patch') {
            const parts = path.split('/');
            const id = parseInt(parts[parts.length - 2]);
            responseData = await mockHandlers['PATCH /appointments/:id/status'](id, body, headers);
        }

        if (responseData !== null) {
            console.log(`[MockServer] RESPONSE: ${method.toUpperCase()} ${path}`, responseData);
            return { status: 200, data: responseData };
        }

        console.error(`[MockServer] 404 NOT FOUND: ${method.toUpperCase()} ${path}`);
        return { status: 404, data: { error: 'Mock route not found' } };

    } catch (err: any) {
        console.error(`[MockServer] ERROR: ${method.toUpperCase()} ${path}`, err);
        const status = err.response?.status || 400;
        const data = err.response?.data || { error: err.message || 'Unknown error' };
        return { status, data };
    }
};
