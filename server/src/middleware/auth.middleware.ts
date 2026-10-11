import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    userId: number;
    email: string;
    role: string;
    companyId?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Yetkisiz erişim. Token bulunamadı.'
            });
        }

        const decoded = verifyBearer(req);
        if (!decoded) throw new Error('invalid token');

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Geçersiz veya süresi dolmuş token.'
        });
    }
};

const verifyBearer = (req: Request): JwtPayload | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
};

/**
 * Kullanıcı JWT'si veya tablet board ekranının `X-Board-Key` başlığı ile kimlik doğrular.
 * Board anahtarıyla gelen istekler `role: 'board'` olarak işaretlenir.
 */
export const companyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const decoded = verifyBearer(req);
    if (decoded) {
        req.user = decoded;
        return next();
    }

    const boardKey = req.header('x-board-key');
    if (boardKey) {
        try {
            const { default: pool } = await import('../config/database');
            const result = await pool.query(
                'SELECT id FROM companies WHERE board_key IS NOT NULL AND UPPER(board_key) = UPPER($1) LIMIT 1',
                [boardKey.trim()]
            );
            if (result.rows.length > 0) {
                req.user = { userId: 0, email: '', role: 'board', companyId: result.rows[0].id };
                return next();
            }
        } catch {
            return res.status(500).json({ success: false, error: 'Kimlik doğrulanamadı' });
        }
    }

    return res.status(401).json({ success: false, error: 'Yetkisiz erişim. Token bulunamadı.' });
};

export const canAccessCompany = (req: Request, companyId: number | null | undefined): boolean => {
    if (!req.user) return false;
    if (req.user.role === 'super_admin') return true;
    return !!companyId && Number(req.user.companyId) === Number(companyId);
};

/**
 * `req.params[param]` içindeki firmaya erişimi doğrular. `roles` verilirse rol de kontrol edilir
 * (super_admin her zaman geçer).
 */
export const requireCompanyAccess = (param = 'id', roles?: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const companyId = parseInt(req.params[param], 10);
        if (!canAccessCompany(req, companyId)) {
            return res.status(403).json({ success: false, error: 'Bu firmada yetkiniz bulunmuyor.' });
        }
        if (roles && req.user!.role !== 'super_admin' && !roles.includes(req.user!.role)) {
            return res.status(403).json({ success: false, error: 'Bu işlem için yetkiniz bulunmuyor.' });
        }
        next();
    };
};

export const roleCheck = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Bu işlem için yetkiniz bulunmuyor.'
            });
        }
        next();
    };
};
