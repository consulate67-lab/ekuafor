import { Request, Response } from 'express';
import MainCompanyService from '../services/mainCompany.service';

class MainCompanyController {
    async create(req: Request, res: Response) {
        try {
            const mainCompany = await MainCompanyService.create(req.body);
            res.status(201).json({ success: true, data: mainCompany });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const mainCompanies = await MainCompanyService.getAll();
            res.json({ success: true, data: mainCompanies });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getById(req: Request, res: Response) {
        try {
            const mainCompany = await MainCompanyService.getById(parseInt(req.params.id));
            if (!mainCompany) return res.status(404).json({ success: false, error: 'Main company not found' });
            res.json({ success: true, data: mainCompany });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getByAdminCode(req: Request, res: Response) {
        try {
            const { code } = req.params;
            const mainCompany = await MainCompanyService.getByAdminCode(code);
            if (!mainCompany) return res.status(404).json({ success: false, error: 'Invalid admin code' });
            res.json({ success: true, data: mainCompany });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const mainCompany = await MainCompanyService.update(parseInt(req.params.id), req.body);
            res.json({ success: true, data: mainCompany });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getBranches(req: Request, res: Response) {
        try {
            const branches = await MainCompanyService.getBranches(parseInt(req.params.id));
            res.json({ success: true, data: branches });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getReports(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const [stats, branches] = await Promise.all([
                MainCompanyService.getStats(id),
                MainCompanyService.getBranchPerformance(id)
            ]);
            res.json({ success: true, data: { stats, branches } });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

export default new MainCompanyController();
