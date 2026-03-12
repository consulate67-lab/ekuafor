import nodemailer from 'nodemailer';

class MailService {
    private transporter;

    constructor() {
        // We'll use environment variables for SMTP details
        // Defaults to common settings if not provided
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendReportEmail(to: string, companyName: string, reportHtml: string) {
        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('[MailService] SMTP credentials missing. Skipping email.');
                return false;
            }

            const info = await this.transporter.sendMail({
                from: `"SaloonTR Management" <${process.env.SMTP_USER}>`,
                to: to,
                subject: `📊 Günlük Performans Raporu - ${companyName}`,
                html: reportHtml,
            });

            console.log(`[MailService] Email sent to ${to}: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error('[MailService] Error sending email:', error);
            return false;
        }
    }
}

export default new MailService();
