import cron from 'node-cron';
import pool from '../config/database';
import reportService from './report.service';
import mailService from './mail.service';

class CronService {
    init() {
        console.log('⏰ Cron Service Initialized - Schedule: 23:00 daily');

        // At 23:00 (11 PM) every day
        cron.schedule('0 23 * * *', async () => {
            console.log('📊 Starting daily report generation...');
            await this.generateAndSendDailyReports();
        });
    }

    private async generateAndSendDailyReports() {
        try {
            // Get all companies with emails
            const companiesRes = await pool.query('SELECT id, name, email FROM companies WHERE is_active = true AND email IS NOT NULL AND email != \'\'');

            for (const company of companiesRes.rows) {
                try {
                    const reports = await reportService.getDetailedCompanyReports(company.id, 'today');

                    // Basic HTML generation
                    const html = this.formatReportHtml(company.name, reports);

                    await mailService.sendReportEmail(company.email, company.name, html);
                } catch (err) {
                    console.error(`Failed to send report for ${company.name}:`, err);
                }
            }
        } catch (error) {
            console.error('Cron Job failed:', error);
        }
    }

    private formatReportHtml(companyName: string, reports: any) {
        const todayDate = new Date().toLocaleDateString('tr-TR');
        const totalAppointments = reports.staffStats.reduce((sum: number, s: any) => sum + s.count, 0);
        const totalRevenue = reports.staffStats.reduce((sum: number, s: any) => sum + s.revenue, 0);

        let staffRows = reports.staffStats.map((s: any) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.staff_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${s.count}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${s.revenue.toLocaleString('tr-TR')} ₺</td>
            </tr>
        `).join('');

        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                <h1 style="color: #1e1b4b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${companyName} - Günlük Rapor</h1>
                <p style="color: #64748b; font-size: 14px;">Tarih: ${todayDate}</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0; display: flex; justify-content: space-between;">
                    <div style="text-align: center; flex: 1;">
                        <span style="display: block; font-size: 24px; font-weight: bold; color: #4f46e5;">${totalAppointments}</span>
                        <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Randevu</span>
                    </div>
                    <div style="text-align: center; flex: 1;">
                        <span style="display: block; font-size: 24px; font-weight: bold; color: #059669;">${totalRevenue.toLocaleString('tr-TR')} ₺</span>
                        <span style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Ciro</span>
                    </div>
                </div>

                <h3>👤 Personel Performansı</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f1f5f9;">
                            <th style="padding: 10px; text-align: left;">Personel</th>
                            <th style="padding: 10px; text-align: center;">Miktar</th>
                            <th style="padding: 10px; text-align: right;">Tutar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staffRows}
                    </tbody>
                </table>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                    Bu mail SaloonTR Yönetim Sistemi tarafından otomatik olarak oluşturulmuştur.
                </div>
            </div>
        `;
    }
}

export default new CronService();
