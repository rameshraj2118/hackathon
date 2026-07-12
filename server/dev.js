import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const api = spawn(process.execPath, [join(root, 'server', 'index.js')], { stdio: 'inherit' })
const client = spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js')], { stdio: 'inherit' })
let stopping = false
function stop(exitCode = 0) { if (stopping) return; stopping = true; api.kill(); client.kill(); process.exit(exitCode) }
api.once('exit', (code) => { if (!stopping) { console.error(`\nAssetNexsus API stopped (code ${code ?? 'unknown'}). Check that port 4000 is free, then run npm.cmd run dev again.`); stop(code || 1) } })
client.once('exit', (code) => { if (!stopping) stop(code || 0) })
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop())
