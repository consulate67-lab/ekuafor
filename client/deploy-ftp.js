import * as ftp from 'basic-ftp';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read from FTP specific env file
dotenv.config({ path: path.join(__dirname, '.env.ftp') });

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const host = process.env.FTP_HOST || 'ftp.saloontr.com';
    const user = process.env.FTP_USER || 'saloon@saloontr.com';
    const password = process.env.FTP_PASSWORD;

    try {
        console.log(`[Deploy] Connecting to FTP: ${host} as ${user}...`);
        await client.access({
            host: host,
            user: user,
            password: password,
            secure: false
        });

        console.log('[Deploy] Connected!');

        console.log('[Deploy] Uploading dist folder...');
        const localDistPath = path.join(__dirname, 'dist');
        const remotePath = "/"; // For some hosting the ftp user is chrooted directly to the web root

        await client.uploadFromDir(localDistPath, remotePath);

        // Also create a fallback .htaccess file for BrowserRouter to work properly on Apache servers
        const htaccessContent = `
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
        `.trim();

        fs.writeFileSync(path.join(localDistPath, '.htaccess'), htaccessContent);
        console.log('[Deploy] Uploading generated .htaccess for modern routing...');
        await client.uploadFrom(path.join(localDistPath, '.htaccess'), '/.htaccess');

        console.log('[Deploy] Successfully deployed to FTP!');
    } catch (err) {
        console.error('[Deploy] Error during deployment:', err);
    } finally {
        client.close();
    }
}

deploy();
