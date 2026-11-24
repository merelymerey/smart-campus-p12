// Usage: node tools/fault-server.mjs <timeout|error|lying|injection> <port>
import { createAppServer } from '../server.js';
import * as f from './fault-adapters.mjs';
const [kind, port] = process.argv.slice(2);
createAppServer({ adapter: f[kind + 'Adapter'], timeoutMs: 3000 }).listen(Number(port), '127.0.0.1', () => console.log(`fault server (${kind}) on http://127.0.0.1:${port}/`));
