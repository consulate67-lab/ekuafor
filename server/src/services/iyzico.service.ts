import Iyzipay from 'iyzipay';

class IyzicoService {
    private iyzipay: any;

    constructor() {
        // Initialize with environment variables or fake keys for now
        this.iyzipay = new Iyzipay({
            apiKey: process.env.IYZICO_API_KEY || 'sandbox-api-key',
            secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-secret-key',
            uri: process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com'
        });
    }

    /**
     * Alt Üye İşyeri (Sub Merchant) Oluşturma Servisi
     * Firmanın banka IBAN bilgileri ile iyzico'da marketplace hesabı açar.
     */
    async createSubMerchant(company: any): Promise<string | null> {
        return new Promise((resolve, reject) => {
            console.log(`[IyzicoService] Creating SubMerchant for Company #${company.id} - ${company.name}`);

            // Gerekli minimum bilgiler:
            // Legal title, IBAN, contact name, email vs.
            // Gerçek iyzico entegrasyonunda bu alanlar zorunludur:
            const request = {
                locale: Iyzipay.LOCALE.TR,
                conversationId: `saloon-company-${company.id}`,
                subMerchantExternalId: `ext-${company.id}-${Date.now()}`,
                subMerchantType: company.company_type === 'ŞAHIS' ? Iyzipay.SUB_MERCHANT_TYPE.PERSONAL : Iyzipay.SUB_MERCHANT_TYPE.PRIVATE_COMPANY,
                address: company.address_line || "Belirtilmemiş",
                taxOffice: company.tax_office || "Bilinmiyor",
                taxNumber: company.tax_number || "1111111111",
                contactName: company.account_holder_name || company.name.split(' ')[0] || "Firma",
                contactSurname: company.name.split(' ').slice(1).join(' ') || "Yetkilisi",
                email: company.email || `iletisim@firma${company.id}.com`,
                gsmNumber: company.phone || "+905555555555",
                name: company.name,
                iban: company.bank_iban,
                identityNumber: "11111111111", // Şahıs firmaları için zorunlu TC
                currency: Iyzipay.CURRENCY.TRY
            };

            // Eğer gerçek anahtarlar yoksa veya test ortamındaysak, doğrudan mock key dönüyoruz.
            // Bu kısım sistemin çökmeden test edilebilmesini sağlar.
            if (!process.env.IYZICO_API_KEY || process.env.IYZICO_API_KEY === 'sandbox-api-key') {
                const mockKey = `sub_merchant_mock_${Math.random().toString(36).substring(7)}`;
                console.log(`[IyzicoService] (Mock Mode) Created SubMerchant Key: ${mockKey}`);
                return resolve(mockKey);
            }

            // Gerçek İyzico isteği:
            this.iyzipay.subMerchant.create(request, function (err: any, result: any) {
                if (err) {
                    console.error('[IyzicoService] SubMerchant Create Error:', err);
                    return reject(err);
                }

                if (result.status === 'success') {
                    console.log(`[IyzicoService] SubMerchant created successfully. Key: ${result.subMerchantKey}`);
                    resolve(result.subMerchantKey);
                } else {
                    console.error('[IyzicoService] SubMerchant Create Failed:', result.errorMessage);
                    reject(new Error(result.errorMessage || 'SubMerchant oluşturulamadı'));
                }
            });
        });
    }

    /**
     * Alt Üye İşyeri Bilgilerini Güncelleme
     */
    async updateSubMerchant(subMerchantKey: string, company: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!process.env.IYZICO_API_KEY || process.env.IYZICO_API_KEY === 'sandbox-api-key') {
                console.log(`[IyzicoService] (Mock Mode) Updated SubMerchant Key: ${subMerchantKey}`);
                return resolve(true);
            }

            const request = {
                locale: Iyzipay.LOCALE.TR,
                conversationId: `update-${company.id}`,
                subMerchantKey: subMerchantKey,
                iban: company.bank_iban,
                address: company.address_line,
                contactName: company.account_holder_name,
                contactSurname: "Yetkilisi",
                email: company.email,
                gsmNumber: company.phone
            };

            this.iyzipay.subMerchant.update(request, function (err: any, result: any) {
                if (err) return reject(err);
                if (result.status === 'success') {
                    resolve(true);
                } else {
                    reject(new Error(result.errorMessage));
                }
            });
        });
    }
}

export default new IyzicoService();
