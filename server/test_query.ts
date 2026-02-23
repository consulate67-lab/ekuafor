
import companyService from './src/services/company.service';

async function test() {
    try {
        console.log('Fetching all companies...');
        const companies = await companyService.getAllCompanies({ is_active: true });
        console.log('Found:', companies.length);
        console.log('Companies:', JSON.stringify(companies, null, 2));
    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test().then(() => process.exit());
