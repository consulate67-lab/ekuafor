import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Appointment } from '../../types';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    success: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    block?: boolean;
    loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', block, loading, disabled, className, children, ...rest }: ButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled || loading}
            className={cx(
                'inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
                size === 'sm' && 'px-3 py-2 text-xs',
                size === 'md' && 'px-4 py-3 text-sm',
                size === 'lg' && 'px-6 py-4 text-base',
                block && 'w-full',
                BUTTON_VARIANTS[variant],
                className,
            )}
            {...rest}
        >
            {loading && <Spinner size="sm" light={variant === 'primary' || variant === 'success'} />}
            {children}
        </button>
    );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            {...(onClick ? { type: 'button' as const, onClick } : {})}
            className={cx('block w-full text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-4', onClick && 'active:scale-[0.99] transition', className)}
        >
            {children}
        </Tag>
    );
}

export function Spinner({ size = 'md', light }: { size?: 'sm' | 'md' | 'lg'; light?: boolean }) {
    return (
        <span
            role="status"
            aria-label="Yükleniyor"
            className={cx(
                'inline-block rounded-full animate-spin border-2',
                light ? 'border-white/30 border-t-white' : 'border-brand-100 border-t-brand-600',
                size === 'sm' && 'w-4 h-4',
                size === 'md' && 'w-8 h-8',
                size === 'lg' && 'w-12 h-12 border-4',
            )}
        />
    );
}

export function FullScreenLoader({ text = 'Yükleniyor…' }: { text?: string }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px]">{text}</p>
        </div>
    );
}

export function EmptyState({ icon = '🗓️', title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center text-center py-12 px-6">
            <div className="text-4xl mb-3" aria-hidden>{icon}</div>
            <p className="font-black text-slate-800">{title}</p>
            {description && <p className="text-sm text-slate-400 font-medium mt-1 max-w-xs">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export type AppointmentStatus = Appointment['status'] | 'rejected' | 'in_progress' | 'no_show';

const STATUS: Record<AppointmentStatus, { label: string; className: string }> = {
    pending: { label: 'Onay bekliyor', className: 'bg-amber-50 text-amber-700' },
    approved: { label: 'Onaylandı', className: 'bg-emerald-50 text-emerald-700' },
    in_progress: { label: 'Devam ediyor', className: 'bg-sky-50 text-sky-700' },
    completed: { label: 'Tamamlandı', className: 'bg-slate-100 text-slate-600' },
    cancelled: { label: 'İptal', className: 'bg-rose-50 text-rose-600' },
    rejected: { label: 'Reddedildi', className: 'bg-rose-50 text-rose-600' },
    no_show: { label: 'Gelmedi', className: 'bg-slate-100 text-slate-500' },
};

export const statusLabel = (status: string) => STATUS[status as AppointmentStatus]?.label ?? status;

export function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status as AppointmentStatus] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
    return <span className={cx('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', s.className)}>{s.label}</span>;
}

export function SectorIcon({ icon, color, size = 'md' }: { icon?: string | null; color?: string | null; size?: 'sm' | 'md' | 'lg' }) {
    return (
        <span
            aria-hidden
            className={cx(
                'inline-flex items-center justify-center rounded-2xl shrink-0',
                size === 'sm' && 'w-8 h-8 text-base',
                size === 'md' && 'w-12 h-12 text-2xl',
                size === 'lg' && 'w-16 h-16 text-3xl',
            )}
            style={{ backgroundColor: color ? `${color}1a` : '#f1f5f9' }}
        >
            {icon || '📅'}
        </span>
    );
}

/** Telefonda alttan açılan panel; geniş ekranda ortada pencere. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="bg-white w-full sm:max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col animate-scale-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h3 className="text-lg font-black text-slate-900">{title}</h3>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-black">✕</button>
                </div>
                <div className="px-6 pb-6 overflow-y-auto">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-slate-100 safe-bottom">{footer}</div>}
            </div>
        </div>
    );
}

export interface NavItem<K extends string> { key: K; label: string; icon: string; badge?: number }

/** Telefon ekranının altındaki sabit sekme çubuğu. */
export function BottomNav<K extends string>({ items, active, onChange }: { items: NavItem<K>[]; active: K; onChange: (key: K) => void }) {
    return (
        <nav className="fixed bottom-0 inset-x-0 z-[100] bg-white/95 backdrop-blur border-t border-slate-100 safe-bottom">
            <div className="max-w-lg mx-auto grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
                {items.map(item => {
                    const isActive = item.key === active;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onChange(item.key)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cx('relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-black uppercase tracking-wider', isActive ? 'text-brand-600' : 'text-slate-400')}
                        >
                            <span className="text-xl leading-none" aria-hidden>{item.icon}</span>
                            {item.label}
                            {!!item.badge && (
                                <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

export function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
    return (
        <header className="sticky top-0 z-50 bg-slate-50/90 backdrop-blur safe-top">
            <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
                {onBack && (
                    <button type="button" onClick={onBack} aria-label="Geri" className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-slate-600 font-black shrink-0">←</button>
                )}
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-black text-slate-900 truncate">{title}</h1>
                    {subtitle && <p className="text-xs font-bold text-slate-400 truncate">{subtitle}</p>}
                </div>
                {right}
            </div>
        </header>
    );
}

export const formatMoney = (value: number | string | null | undefined) => {
    const amount = Number(value || 0);
    return `${amount < 0 ? '−' : ''}₺${Math.abs(amount).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
};
