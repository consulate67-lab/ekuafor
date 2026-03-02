import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => { logs.push('LOG: ' + msg.text()); console.log(msg.text()) });
    page.on('pageerror', error => { logs.push('ERROR: ' + error.message); console.log(error.message) });

    try {
        await page.goto('https://consulate67-lab.github.io/ekuafor/saloontr-web', { waitUntil: 'domcontentloaded', timeout: 5000 });
        // wait for 2 seconds to let react render
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        logs.push('GOTO ERR: ' + e.message);
    }

    const html = await page.content();
    logs.push('HTML length: ' + html.length);
    logs.push('HTML: ' + html.substring(0, 1000));

    fs.writeFileSync('puppeteer-logs.txt', logs.join('\n'));

    await browser.close();
})();
