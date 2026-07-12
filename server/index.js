import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(scryptCallback), port = Number(process.env.PORT || 4000), dataFile = join(dirname(fileURLToPath(import.meta.url)), 'data', 'db.json'), secret = process.env.JWT_SECRET || 'assetnexsus-development-secret-change-before-production'
async function database() { try { return JSON.parse(await readFile(dataFile, 'utf8')) } catch { return { users: [] } } }
async function save(data) { await mkdir(dirname(dataFile), { recursive: true }); await writeFile(dataFile, JSON.stringify(data, null, 2)) }
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'), hash = await scrypt(password, salt, 64); return `${salt}:${hash.toString('hex')}` }
async function passwordMatches(password, stored) { const [salt, hash] = stored.split(':'), candidate = await scrypt(password, salt, 64); return timingSafeEqual(candidate, Buffer.from(hash, 'hex')) }
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
function tokenFor(user, persistent) { const header = encode({ alg: 'HS256', typ: 'JWT' }), payload = encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + (persistent ? 2592000 : 28800) }), signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); return `${header}.${payload}.${signature}` }
function userFromToken(token) { try { const [header, payload, signature] = token.split('.'), expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; const session = JSON.parse(Buffer.from(payload, 'base64url').toString()); return session.exp > Date.now() / 1000 ? session : null } catch { return null } }
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); response.end(JSON.stringify(body)) }
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; try { return JSON.parse(raw || '{}') } catch { return null } }
const bearer = (request) => request.headers.authorization?.replace(/^Bearer\s+/i, '')

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {})
  const url = new URL(request.url || '/', `http://${request.headers.host}`)
  if (request.method === 'POST' && url.pathname === '/api/auth/register') { const input = await body(request); if (!input || !input.name?.trim() || !/^\S+@\S+\.\S+$/.test(input.email || '') || typeof input.password !== 'string' || input.password.length < 8) return json(response, 400, { message: 'Provide a name, valid email, and a password of at least 8 characters.' }); const data = await database(), email = input.email.trim().toLowerCase(); if (data.users.some((user) => user.email === email)) return json(response, 409, { message: 'An account already exists for this email.' }); const user = { id: randomBytes(12).toString('hex'), name: input.name.trim(), email, role: 'member', password: await hashPassword(input.password), createdAt: new Date().toISOString() }; data.users.push(user); await save(data); return json(response, 201, { user: publicUser(user) }) }
  if (request.method === 'POST' && url.pathname === '/api/auth/login') { const input = await body(request); if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') return json(response, 400, { message: 'Email and password are required.' }); const data = await database(), user = data.users.find((entry) => entry.email === input.email.trim().toLowerCase()); if (!user || !(await passwordMatches(input.password, user.password))) return json(response, 401, { message: 'Incorrect email or password.' }); return json(response, 200, { token: tokenFor(user, Boolean(input.remember)), user: publicUser(user) }) }
  if (request.method === 'GET' && url.pathname === '/api/auth/me') { const session = userFromToken(bearer(request) || ''); if (!session) return json(response, 401, { message: 'Your session has expired. Please sign in again.' }); const data = await database(), user = data.users.find((entry) => entry.id === session.sub); if (!user) return json(response, 401, { message: 'Account no longer exists.' }); return json(response, 200, { user: publicUser(user) }) }
  json(response, 404, { message: 'Route not found.' })
})
server.listen(port, () => console.log(`AssetNexsus API listening on http://localhost:${port}`))
