import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scrypt = promisify(scryptCallback)
const port = Number(process.env.PORT || 4000)
const dataFile = join(dirname(fileURLToPath(import.meta.url)), 'data', 'db.json')
const secret = process.env.JWT_SECRET || 'assetnexsus-development-secret-change-before-production'
const roles = new Set(['employee', 'department_head', 'asset_manager'])

async function database() { try { const data = JSON.parse(await readFile(dataFile, 'utf8')); return { users: [], resetTokens: [], companyDashboard: null, ...data } } catch { return { users: [], resetTokens: [], companyDashboard: null } } }
async function save(data) { await mkdir(dirname(dataFile), { recursive: true }); await writeFile(dataFile, JSON.stringify(data, null, 2)) }
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'), hash = await scrypt(password, salt, 64); return `${salt}:${hash.toString('hex')}` }
async function passwordMatches(password, stored) { const [salt, hash] = stored.split(':'), candidate = await scrypt(password, salt, 64); return timingSafeEqual(candidate, Buffer.from(hash, 'hex')) }
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
function tokenFor(user, persistent) { const header = encode({ alg: 'HS256', typ: 'JWT' }), payload = encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + (persistent ? 2592000 : 28800) }), signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); return `${header}.${payload}.${signature}` }
function userFromToken(token) { try { const [header, payload, signature] = token.split('.'), expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; const session = JSON.parse(Buffer.from(payload, 'base64url').toString()); return session.exp > Date.now() / 1000 ? session : null } catch { return null } }
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS' }); response.end(JSON.stringify(body)) }
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; try { return JSON.parse(raw || '{}') } catch { return null } }
const bearer = (request) => request.headers.authorization?.replace(/^Bearer\s+/i, '')
async function authorizedUser(request) { const session = userFromToken(bearer(request) || ''); if (!session) return null; const data = await database(); return { data, user: data.users.find((entry) => entry.id === session.sub) || null } }
function validRegistration(input) { return input && input.name?.trim() && /^\S+@\S+\.\S+$/.test(input.email || '') && typeof input.password === 'string' && input.password.length >= 8 }
function mockCompanyDashboard() { return { company: { name: 'Northstar Holdings', date: 'Saturday, 12 July 2026' }, metrics: [{ label: 'Total Assets', value: 342, icon: 'cube', tone: 'slate' }, { label: 'Available', value: 127, icon: 'check', tone: 'teal' }, { label: 'Allocated', value: 158, icon: 'transfer', tone: 'teal' }, { label: 'Maintenance', value: 18, icon: 'wrench', tone: 'orange' }, { label: 'Active Bookings', value: 4, icon: 'calendar', tone: 'purple' }, { label: 'Overdue Returns', value: 3, icon: 'alert', tone: 'rose', note: 'Needs action' }], allocation: [{ label: 'Available', value: 127, tone: 'teal' }, { label: 'Allocated', value: 158, tone: 'green' }, { label: 'Other', value: 57, tone: 'slate' }], statuses: [{ label: 'Available', value: 127, tone: 'teal' }, { label: 'Allocated', value: 158, tone: 'teal' }, { label: 'Maintenance', value: 18, tone: 'orange' }, { label: 'Reserved', value: 9, tone: 'purple' }, { label: 'Lost', value: 3, tone: 'rose' }, { label: 'Retired', value: 27, tone: 'slate' }], departments: [{ name: 'IT', assets: 85, bookings: 18 }, { name: 'Operations', assets: 72, bookings: 27 }, { name: 'Finance', assets: 38, bookings: 8 }, { name: 'Marketing', assets: 31, bookings: 22 }, { name: 'HR', assets: 24, bookings: 15 }, { name: 'Facilities', assets: 88, bookings: 6 }], maintenance: [{ month: 'Feb', requests: 5, resolved: 5 }, { month: 'Mar', requests: 8, resolved: 7 }, { month: 'Apr', requests: 6, resolved: 6 }, { month: 'May', requests: 10, resolved: 8 }, { month: 'Jun', requests: 7, resolved: 7 }, { month: 'Jul', requests: 6, resolved: 2 }], bookingHeatmap: [[1,2,3,4,1,0,2,3,2,1],[1,3,4,4,2,0,3,4,3,2],[1,3,4,4,2,1,3,4,3,2],[1,2,3,2,1,1,2,3,2,1],[1,2,3,2,1,0,2,3,1,1]], activities: [{ tone: 'rose', title: 'Overdue Return Alert', detail: 'HP LaserJet Pro (AF-0003) assigned to Priya Sharma is 337 days overdue.', time: '2 hours ago' }, { tone: 'orange', title: 'Maintenance Request Pending', detail: 'Toyota Innova AC issue raised by Rahul Verma awaiting approval.', time: '4 hours ago' }, { tone: 'purple', title: 'Booking Confirmed', detail: 'Meeting Room B2 booked by Priya Sharma on Jul 14, 09:00-10:30.', time: '5 hours ago' }, { tone: 'teal', title: 'Asset Assigned', detail: 'iPad Pro 12.9 (AF-0011) allocated to Rohan Gupta by Asset Manager.', time: '1 day ago' }] } }

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {})
  const url = new URL(request.url || '/', `http://${request.headers.host}`)
  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const input = await body(request); if (!validRegistration(input)) return json(response, 400, { message: 'Provide a name, valid email, and a password of at least 8 characters.' })
    const data = await database(), email = input.email.trim().toLowerCase(); if (data.users.some((user) => user.email === email)) return json(response, 409, { message: 'An account already exists for this email.' })
    const user = { id: randomBytes(12).toString('hex'), name: input.name.trim(), email, role: 'employee', password: await hashPassword(input.password), createdAt: new Date().toISOString() }
    data.users.push(user); await save(data); return json(response, 201, { user: publicUser(user) })
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const input = await body(request); if (!input || typeof input.email !== 'string' || typeof input.password !== 'string') return json(response, 400, { message: 'Email and password are required.' })
    const data = await database(), user = data.users.find((entry) => entry.email === input.email.trim().toLowerCase()); if (!user || !(await passwordMatches(input.password, user.password))) return json(response, 401, { message: 'Incorrect email or password.' })
    return json(response, 200, { token: tokenFor(user, Boolean(input.remember)), user: publicUser(user) })
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
    const input = await body(request), email = input?.email?.trim().toLowerCase(); const data = await database(), user = data.users.find((entry) => entry.email === email)
    if (user) { const code = randomBytes(3).toString('hex').toUpperCase(); data.resetTokens = data.resetTokens.filter((entry) => entry.userId !== user.id); data.resetTokens.push({ userId: user.id, code, expiresAt: Date.now() + 15 * 60 * 1000 }); await save(data); console.log(`Password reset code for ${email}: ${code}`) }
    return json(response, 200, { message: 'If that email belongs to an account, reset instructions have been sent.' })
  }
  if (request.method === 'POST' && url.pathname === '/api/auth/reset-password') {
    const input = await body(request); if (!input || typeof input.email !== 'string' || typeof input.code !== 'string' || typeof input.password !== 'string' || input.password.length < 8) return json(response, 400, { message: 'Enter your email, reset code, and a password of at least 8 characters.' })
    const data = await database(), user = data.users.find((entry) => entry.email === input.email.trim().toLowerCase()), reset = data.resetTokens.find((entry) => entry.userId === user?.id && entry.code === input.code.trim().toUpperCase() && entry.expiresAt > Date.now())
    if (!user || !reset) return json(response, 400, { message: 'That reset code is invalid or has expired.' }); user.password = await hashPassword(input.password); data.resetTokens = data.resetTokens.filter((entry) => entry !== reset); await save(data); return json(response, 200, { message: 'Password updated. You can now sign in.' })
  }
  if (request.method === 'GET' && url.pathname === '/api/auth/me') { const auth = await authorizedUser(request); if (!auth?.user) return json(response, 401, { message: 'Your session has expired. Please sign in again.' }); return json(response, 200, { user: publicUser(auth.user) }) }
  if (request.method === 'GET' && url.pathname === '/api/dashboard/overview') { const auth = await authorizedUser(request); if (!auth?.user) return json(response, 401, { message: 'Your session has expired. Please sign in again.' }); if (!auth.data.companyDashboard) { auth.data.companyDashboard = mockCompanyDashboard(); await save(auth.data) }; return json(response, 200, { dashboard: auth.data.companyDashboard }) }
  if (request.method === 'GET' && url.pathname === '/api/admin/employees') { const auth = await authorizedUser(request); if (auth?.user?.role !== 'admin') return json(response, 403, { message: 'Only admins can view the Employee Directory.' }); return json(response, 200, { users: auth.data.users.map(publicUser) }) }
  if (request.method === 'PATCH' && /^\/api\/admin\/employees\/[a-f0-9]+\/role$/.test(url.pathname)) { const auth = await authorizedUser(request); if (auth?.user?.role !== 'admin') return json(response, 403, { message: 'Only admins can change employee roles.' }); const input = await body(request), id = url.pathname.split('/')[4], employee = auth.data.users.find((entry) => entry.id === id); if (!employee) return json(response, 404, { message: 'Employee not found.' }); if (!roles.has(input?.role)) return json(response, 400, { message: 'Role must be employee, department_head, or asset_manager.' }); employee.role = input.role; await save(auth.data); return json(response, 200, { user: publicUser(employee) }) }
  json(response, 404, { message: 'Route not found.' })
})
server.listen(port, () => console.log(`AssetNexsus API listening on http://localhost:${port}`))
