/** Giriş yapan kullanıcının ana ekranı. */
export const homePathFor = (role?: string | null) => {
    if (role === 'company_admin' || role === 'staff') return '/isletme';
    if (role === 'customer') return '/app';
    return '/dashboard';
};
