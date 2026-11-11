/**
 * Saloon Tablet kurulum anahtarı Telegram botu.
 *
 * Railway / lokal:
 *   TELEGRAM_BOT_TOKEN=...   (BotFather)
 *   TELEGRAM_ALLOWED_CHAT_IDS=123,456
 *   TABLET_API_BASE=https://web-production-db847.up.railway.app/api
 *   TABLET_KEY_SECRET=...    (sunucu ile aynı)
 *
 * Çalıştır: npx tsx scripts/tablet-telegram-bot.ts
 * Komutlar: /start  /key  /yeni
 */
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const apiBase = (process.env.TABLET_API_BASE || 'https://web-production-db847.up.railway.app/api').replace(/\/$/, '');
const secret = process.env.TABLET_KEY_SECRET || process.env.JWT_SECRET || '';
const allowed = new Set(
    String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
);

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN gerekli');
    process.exit(1);
}

type TgUpdate = {
    update_id: number;
    message?: { chat: { id: number }; text?: string; from?: { id: number } };
};

async function tg(method: string, body: Record<string, unknown>) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function createKey(createdBy: string) {
    const res = await fetch(`${apiBase}/tablet/keys`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Tablet-Key-Secret': secret,
        },
        body: JSON.stringify({ createdBy, secret }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data.data.key as string;
}

async function handleMessage(chatId: number, text: string) {
    const cmd = text.trim().split(/\s+/)[0].toLowerCase();
    if (allowed.size && !allowed.has(String(chatId))) {
        await tg('sendMessage', { chat_id: chatId, text: 'Bu botu kullanma yetkiniz yok.' });
        return;
    }
    if (cmd === '/start') {
        await tg('sendMessage', {
            chat_id: chatId,
            text: 'Saloon Tablet kurulum botu.\nYeni anahtar için: /key veya /yeni',
        });
        return;
    }
    if (cmd === '/key' || cmd === '/yeni') {
        try {
            const key = await createKey(`tg:${chatId}`);
            await tg('sendMessage', {
                chat_id: chatId,
                text: `Kurulum anahtarı (bir cihaz):\n\n${key}\n\nTablette kurulumda bu kodu girin. İnternet gerekli.`,
            });
        } catch (e) {
            await tg('sendMessage', {
                chat_id: chatId,
                text: `Anahtar üretilemedi: ${e instanceof Error ? e.message : e}`,
            });
        }
        return;
    }
    await tg('sendMessage', { chat_id: chatId, text: 'Komutlar: /key  /yeni' });
}

async function loop() {
    console.log('[tablet-telegram-bot] polling…');
    let offset = 0;
    for (;;) {
        try {
            const data = (await tg('getUpdates', { offset, timeout: 30 })) as {
                ok: boolean;
                result?: TgUpdate[];
            };
            for (const u of data.result || []) {
                offset = u.update_id + 1;
                const msg = u.message;
                if (msg?.text) await handleMessage(msg.chat.id, msg.text);
            }
        } catch (e) {
            console.warn('[bot]', e instanceof Error ? e.message : e);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

loop();
