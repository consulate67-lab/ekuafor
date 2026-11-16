import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';

const require = createRequire(pathToFileURL(path.join('/app/server', 'package.json')).href);
const Redis = require('ioredis');
const id = process.argv[2] || '5';
const redis = new Redis(process.env.REDIS_URL);
const n = await redis.del(`company:detail:${id}`);
console.log('deleted', n);
await redis.quit();
