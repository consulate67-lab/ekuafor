import pool from '../config/database';
import pushService from './push.service';
import smsService from './sms.service';
import mailService from './mail.service';

class AutomationService {
    async runAutomations() {
        console.log('🤖 [AutomationService] Starting automation rule check...');
        try {
            // Get all active rules
            const rulesRes = await pool.query('SELECT * FROM automation_rules WHERE is_active = true');
            const rules = rulesRes.rows;

            if (rules.length === 0) {
                console.log('[AutomationService] No active automation rules found.');
                return;
            }

            for (const rule of rules) {
                console.log(`[AutomationService] Processing rule: ${rule.name || 'Unnamed'} (ID: ${rule.id})`);
                await this.processRule(rule);
            }
            console.log('🤖 [AutomationService] Automation run completed.');
        } catch (error) {
            console.error('[AutomationService] Critical error during automation run:', error);
        }
    }

    private async processRule(rule: any) {
        try {
            if (!rule.sql_script) {
                console.warn(`[AutomationService] Rule ${rule.id} has no SQL script, skipping.`);
                return;
            }

            // Replace ${company_id} in the script with the actual company_id
            let sql = String(rule.sql_script).replace(/\$\{company_id\}/g, String(rule.company_id || 0));
            
            // Execute the custom query
            // The query MUST return at least 'phone' (and ideally 'name', 'email')
            const result = await pool.query(sql);
            const targets = result.rows;

            console.log(`[AutomationService] Rule "${rule.name}" matched ${targets.length} customers.`);

            for (const target of targets) {
                // Target fields might be case sensitive depending on SQL
                const phone = target.phone || target.customer_phone || target.GSM || target.Phone;
                const name = target.name || target.customer_name || target.Name || 'Değerli Müşterimiz';
                const email = target.email || target.Email;

                if (!phone) {
                    console.warn(`[AutomationService] Match found in rule ${rule.id} but no phone number provided.`, target);
                    continue;
                }

                // Personalize message
                let message = rule.message_template || `Merhaba {name}, size özel bir kampanyamız var!`;
                message = message.replace(/\{name\}/g, name);
                
                try {
                    switch (String(rule.action_type).toLowerCase()) {
                        case 'push':
                            const token = await pushService.getPushTokenByPhone(phone);
                            if (token) {
                                await pushService.sendNotification(token, rule.name, message, { rule_id: rule.id }, phone);
                            }
                            break;
                        case 'sms':
                            await smsService.sendSms(rule.company_id, phone, message);
                            break;
                        case 'email':
                            if (email) {
                                await mailService.sendEmail(email, rule.name, message);
                            }
                            break;
                    }
                } catch (sendError: any) {
                    console.error(`[AutomationService] Failed to send ${rule.action_type} to ${phone}:`, sendError.message);
                }
            }
        } catch (error: any) {
            console.error(`[AutomationService] Error processing rule ${rule.id} (${rule.name}):`, error.message);
        }
    }
}

export default new AutomationService();
