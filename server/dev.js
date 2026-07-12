import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const root = dirname(dirname(fileURLToPath(import.meta.url))), api = spawn(process.execPath, [join(root, 'server', 'index.js')], { stdio: 'inherit' }), client = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { stdio: 'inherit' })
const stop = () => { api.kill(); client.kill(); process.exit() }; process.on('SIGINT', stop); process.on('SIGTERM', stop)
