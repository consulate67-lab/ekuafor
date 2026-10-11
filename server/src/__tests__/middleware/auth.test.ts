import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import { canAccessCompany, requireCompanyAccess } from '../../middleware/auth.middleware';

function makeReq(user: any, params: Record<string, string> = {}): Request {
    return { user, params } as unknown as Request;
}

function makeRes(): Response {
    const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res as Response;
}

describe('canAccessCompany', () => {
    it('allows super_admin for any company', () => {
        expect(canAccessCompany(makeReq({ role: 'super_admin' }), 42)).toBe(true);
    });

    it('allows a user only for their own company', () => {
        const req = makeReq({ role: 'company_admin', companyId: 7 });
        expect(canAccessCompany(req, 7)).toBe(true);
        expect(canAccessCompany(req, '7' as any)).toBe(true);
        expect(canAccessCompany(req, 8)).toBe(false);
    });

    it('denies customers without a company and system-wide (0) access', () => {
        expect(canAccessCompany(makeReq({ role: 'customer', companyId: null }), 7)).toBe(false);
        expect(canAccessCompany(makeReq({ role: 'company_admin', companyId: 7 }), 0)).toBe(false);
    });

    it('denies unauthenticated requests', () => {
        expect(canAccessCompany(makeReq(undefined), 7)).toBe(false);
    });
});

describe('requireCompanyAccess', () => {
    it('calls next for a matching company and allowed role', () => {
        const next = vi.fn();
        const res = makeRes();
        requireCompanyAccess('id', ['company_admin'])(makeReq({ role: 'company_admin', companyId: 5 }, { id: '5' }), res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 for another company', () => {
        const next = vi.fn();
        const res = makeRes();
        requireCompanyAccess('id')(makeReq({ role: 'company_admin', companyId: 5 }, { id: '6' }), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when the role is not allowed', () => {
        const next = vi.fn();
        const res = makeRes();
        requireCompanyAccess('id', ['company_admin'])(makeReq({ role: 'staff', companyId: 5 }, { id: '5' }), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('lets super_admin through regardless of role list', () => {
        const next = vi.fn();
        requireCompanyAccess('companyId', ['company_admin'])(makeReq({ role: 'super_admin' }, { companyId: '9' }), makeRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
