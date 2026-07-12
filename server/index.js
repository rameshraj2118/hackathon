import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listRows, saveRow, removeRow } from './database.js'

const scrypt = promisify(scryptCallback)
const port = Number(process.env.PORT || 4000)
const dataFile = join(dirname(fileURLToPath(import.meta.url)), 'data', 'db.json')
const secret = process.env.JWT_SECRET || 'assetnexsus-development-secret-change-before-production'
const roles = new Set(['employee', 'department_head', 'asset_manager'])
const adminOnlyTables = new Set(['departments', 'categories', 'employees'])

async function database() { try { const data = JSON.parse(await readFile(dataFile, 'utf8')); return { users: [], resetTokens: [], companyDashboard: null, ...data } } catch { return { users: [], resetTokens: [], companyDashboard: null } } }
async function save(data) { await mkdir(dirname(dataFile), { recursive: true }); await writeFile(dataFile, JSON.stringify(data, null, 2)) }
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'), hash = await scrypt(password, salt, 64); return `${salt}:${hash.toString('hex')}` }
async function passwordMatches(password, stored) { const [salt, hash] = stored.split(':'), candidate = await scrypt(password, salt, 64); return timingSafeEqual(candidate, Buffer.from(hash, 'hex')) }
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
function tokenFor(user, persistent) { const header = encode({ alg: 'HS256', typ: 'JWT' }), payload = encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + (persistent ? 2592000 : 28800) }), signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); return `${header}.${payload}.${signature}` }
function userFromToken(token) { try { const [header, payload, signature] = token.split('.'), expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'); if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; const session = JSON.parse(Buffer.from(payload, 'base64url').toString()); return session.exp > Date.now() / 1000 ? session : null } catch { return null } }
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role })
function json(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' }); response.end(JSON.stringify(body)) }
function bookingConflict(value) {
  if (!value || !value.resourceId || !value.date || !/^\d{2}:\d{2}$/.test(value.start || '') || !/^\d{2}:\d{2}$/.test(value.end || '')) return 'Provide a resource, date, and valid start and end times.'
  const toMinutes = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes }
  const start = toMinutes(value.start), end = toMinutes(value.end)
  if (end <= start) return 'End time must be after start time.'
  const conflict = listRows('bookings').find((booking) => booking.id !== value.id && booking.resourceId === value.resourceId && booking.date === value.date && booking.status !== 'Cancelled' && start < toMinutes(booking.end) && end > toMinutes(booking.start))
  return conflict ? `Time conflict: ${conflict.start}–${conflict.end} is already booked by ${conflict.person}.` : ''
}
async function body(request) { let raw = ''; for await (const chunk of request) raw += chunk; try { return JSON.parse(raw || '{}') } catch { return null } }
const bearer = (request) => request.headers.authorization?.replace(/^Bearer\s+/i, '')
async function authorizedUser(request) { const session = userFromToken(bearer(request) || ''); if (!session) return null; const data = await database(); return { data, user: data.users.find((entry) => entry.id === session.sub) || null } }
function validRegistration(input) { return input && input.name?.trim() && /^\S+@\S+\.\S+$/.test(input.email || '') && typeof input.password === 'string' && input.password.length >= 8 }
const compactName = (name) => ({ 'Information Technology': 'IT', 'Human Resources': 'HR', 'Research & Development': 'R&D' })[name] || name
const todayIso = () => new Date().toISOString().slice(0, 10)
const monthLabel = (index) => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(Date.UTC(new Date().getUTCFullYear(), index, 1)))
function latestBy(rows, field, limit = 2) { return rows.filter((row) => row[field]).sort((left, right) => String(right[field]).localeCompare(String(left[field]))).slice(0, limit) }
function syncAssetFromAllocation(value) {
  const asset = listRows('assets').find((item) => item.tag === value.assetTag)
  if (!asset) return
  const updated = value.status === 'Returned'
    ? { ...asset, status: 'Available', holder: '', department: asset.department || value.department }
    : { ...asset, status: 'Allocated', holder: value.holder, department: value.department || asset.department }
  saveRow('assets', 'tag', updated)
}
function syncResourceFromBooking(value) {
  const resource = listRows('resources').find((item) => item.id === value.resourceId)
  if (!resource || resource.status === 'Allocated') return
  const hasActiveBooking = listRows('bookings').some((booking) => booking.resourceId === value.resourceId && ['Upcoming', 'Ongoing'].includes(booking.status))
  saveRow('resources', 'id', { ...resource, status: hasActiveBooking ? 'Reserved' : 'Available' })
}
function syncAssetFromMaintenance(value) {
  const asset = listRows('assets').find((item) => item.tag === value.assetTag)
  if (!asset) return
  if (['Approved', 'Technician Assigned', 'In Progress'].includes(value.status)) {
    saveRow('assets', 'tag', { ...asset, status: 'Under Maintenance' })
    return
  }
  const allocation = listRows('allocations').find((item) => item.assetTag === value.assetTag && item.status !== 'Returned')
  saveRow('assets', 'tag', allocation ? { ...asset, status: 'Allocated', holder: allocation.holder, department: allocation.department || asset.department } : { ...asset, status: 'Available' })
}
function databaseDashboard() {
  const assets = listRows('assets')
  const allocations = listRows('allocations')
  const bookings = listRows('bookings')
  const maintenanceRecords = listRows('maintenance')
  const departments = listRows('departments')
  const transfers = listRows('transfers')
  const activeAllocations = allocations.filter((item) => item.status !== 'Returned')
  const overdueAllocations = activeAllocations.filter((item) => item.status === 'Overdue' || (item.expectedReturnDate && item.expectedReturnDate < todayIso()))
  const activeBookings = bookings.filter((item) => ['Upcoming', 'Ongoing'].includes(item.status))
  const statusCounts = assets.reduce((counts, asset) => {
    const status = asset.status === 'Under Maintenance' ? 'Maintenance' : asset.status || 'Available'
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})
  const available = statusCounts.Available || 0
  const allocated = statusCounts.Allocated || activeAllocations.length
  const maintenance = statusCounts.Maintenance || 0
  const other = Math.max(assets.length - available - allocated, 0)
  const bookingDepartments = bookings.reduce((counts, booking) => {
    counts[booking.department] = (counts[booking.department] || 0) + 1
    return counts
  }, {})
  const assetDepartments = assets.reduce((counts, asset) => {
    const department = asset.department || 'Unassigned'
    counts[department] = (counts[department] || 0) + 1
    return counts
  }, {})
  const departmentRows = (departments.length ? departments : Object.keys({ ...assetDepartments, ...bookingDepartments }).map((name) => ({ name }))).map((department) => ({
    name: compactName(department.name),
    assets: assetDepartments[department.name] || 0,
    bookings: bookingDepartments[department.name] || 0,
  }))
  const maxDepartmentValue = Math.max(1, ...departmentRows.flatMap((item) => [item.assets, item.bookings]))
  const heatmap = Array.from({ length: 5 }, () => Array(10).fill(0))
  bookings.forEach((booking) => {
    const day = new Date(`${booking.date}T00:00:00`).getDay() - 1
    const hour = Number(String(booking.start || '00:00').slice(0, 2)) - 8
    if (day >= 0 && day < 5 && hour >= 0 && hour < 10 && booking.status !== 'Cancelled') heatmap[day][hour] += 1
  })
  const maxHeat = Math.max(1, ...heatmap.flat())
  const currentMonth = new Date().getUTCMonth()
  const months = Array.from({ length: 6 }, (_, index) => (currentMonth - 5 + index + 12) % 12)
  const maintenanceRows = months.map((month) => {
    const monthRecords = maintenanceRecords.filter((item) => new Date(`${item.raisedOn || todayIso()}T00:00:00`).getUTCMonth() === month)
    return { month: monthLabel(month), requests: monthRecords.length, resolved: monthRecords.filter((item) => item.status === 'Resolved').length }
  })
  const activities = [
    ...latestBy(allocations, 'allocatedOn').map((item) => ({ tone: item.status === 'Overdue' ? 'rose' : 'teal', title: item.status === 'Overdue' ? 'Overdue Return Alert' : 'Asset Assigned', detail: `${item.assetName} (${item.assetTag}) is assigned to ${item.holder}.`, time: item.allocatedOn || 'Recently' })),
    ...latestBy(bookings, 'date').map((item) => ({ tone: item.status === 'Cancelled' ? 'rose' : 'purple', title: item.status === 'Cancelled' ? 'Booking Cancelled' : 'Booking Confirmed', detail: `${item.resourceId} booked by ${item.person} on ${item.date}, ${item.start}-${item.end}.`, time: item.date })),
    ...latestBy(maintenanceRecords, 'raisedOn', 1).map((item) => ({ tone: item.status === 'Resolved' ? 'teal' : 'orange', title: `Maintenance ${item.status}`, detail: `${item.assetName} (${item.assetTag}) - ${item.issue}`, time: item.raisedOn || 'Recently' })),
    ...latestBy(transfers, 'id', 1).map((item) => ({ tone: item.status === 'Requested' ? 'purple' : 'teal', title: `Transfer ${item.status}`, detail: `${item.assetName} (${item.assetTag}) from ${item.from} to ${item.to}.`, time: 'Recently' })),
  ].slice(0, 5)
  return {
    company: { name: 'AssetNexsus', date: new Intl.DateTimeFormat('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()) },
    metrics: [
      { label: 'Total Assets', value: assets.length, icon: 'cube', tone: 'slate' },
      { label: 'Available', value: available, icon: 'check', tone: 'teal' },
      { label: 'Allocated', value: allocated, icon: 'transfer', tone: 'teal' },
      { label: 'Maintenance', value: maintenance, icon: 'wrench', tone: 'orange' },
      { label: 'Active Bookings', value: activeBookings.length, icon: 'calendar', tone: 'purple' },
      { label: 'Overdue Returns', value: overdueAllocations.length, icon: 'alert', tone: 'rose', note: overdueAllocations.length ? 'Needs action' : 'Clear' },
    ],
    allocation: [{ label: 'Available', value: available, tone: 'teal' }, { label: 'Allocated', value: allocated, tone: 'green' }, { label: 'Other', value: other, tone: 'slate' }],
    statuses: ['Available', 'Allocated', 'Maintenance', 'Reserved', 'Lost', 'Retired'].map((label) => ({ label, value: statusCounts[label] || 0, tone: label === 'Maintenance' ? 'orange' : label === 'Reserved' ? 'purple' : label === 'Lost' ? 'rose' : label === 'Retired' ? 'slate' : 'teal' })),
    departments: departmentRows.map((item) => ({ ...item, assets: Math.round((item.assets / maxDepartmentValue) * 100), bookings: Math.round((item.bookings / maxDepartmentValue) * 100) })),
    maintenance: maintenanceRows,
    bookingHeatmap: heatmap.map((row) => row.map((count) => Math.round((count / maxHeat) * 4))),
    activities: activities.length ? activities : [{ tone: 'slate', title: 'Database Ready', detail: 'Add assets, allocations, or bookings to populate live activity.', time: 'Now' }],
  }
}

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
  const entity = url.pathname.match(/^\/api\/(assets|departments|categories|employees|resources|bookings|allocations|transfers|maintenance)(?:\/([^/]+))?$/)
  if (entity) { const auth = await authorizedUser(request); if (!auth?.user) return json(response, 401, { message: 'Your session has expired. Please sign in again.' }); const [_, table, id] = entity; const key = table === 'assets' ? 'tag' : table === 'departments' ? 'id' : table === 'categories' ? 'code' : table === 'employees' ? 'employee_id' : 'id'; const writes = request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE'; if (writes && adminOnlyTables.has(table) && auth.user.role !== 'admin') return json(response, 403, { message: 'Only admins can modify organization setup.' }); if (request.method === 'DELETE' && table === 'assets' && !['admin', 'asset_manager'].includes(auth.user.role)) return json(response, 403, { message: 'Only admins and Asset Managers can delete assets.' }); if (request.method === 'GET') return json(response, 200, { [table]: listRows(table) }); if (request.method === 'POST' || request.method === 'PATCH') { const value = await body(request); if (!value || !value[key]) return json(response, 400, { message: `A ${key} is required.` }); if (table === 'departments' && !['Active', 'Inactive'].includes(value.status)) return json(response, 400, { message: 'Department status must be Active or Inactive.' }); if (table === 'employees' && value.role && !roles.has(value.role)) return json(response, 400, { message: 'Invalid employee role.' }); if (table === 'allocations' && (!value.assetTag || !value.assetName || !value.holder || !['Active', 'Overdue', 'Returned'].includes(value.status))) return json(response, 400, { message: 'Allocation details are incomplete or invalid.' }); if (table === 'transfers' && (!value.assetTag || !value.assetName || !value.from || !value.to || !Array.isArray(value.history))) return json(response, 400, { message: 'Transfer details are incomplete or invalid.' }); if (table === 'maintenance' && (!value.assetTag || !value.assetName || !value.issue || !Array.isArray(value.history))) return json(response, 400, { message: 'Maintenance details are incomplete.' }); if (table === 'bookings') { const conflict = bookingConflict(value); if (conflict) return json(response, 409, { message: conflict }) }; saveRow(table, key, value); if (table === 'allocations') syncAssetFromAllocation(value); if (table === 'bookings') syncResourceFromBooking(value); if (table === 'maintenance') syncAssetFromMaintenance(value); return json(response, 200, { item: value }) } if (request.method === 'DELETE' && id) { removeRow(table, key, id); return json(response, 204, {}) } }
  if (request.method === 'GET' && url.pathname === '/api/dashboard/overview') { const auth = await authorizedUser(request); if (!auth?.user) return json(response, 401, { message: 'Your session has expired. Please sign in again.' }); return json(response, 200, { dashboard: databaseDashboard() }) }
  if (request.method === 'GET' && url.pathname === '/api/admin/employees') { const auth = await authorizedUser(request); if (auth?.user?.role !== 'admin') return json(response, 403, { message: 'Only admins can view the Employee Directory.' }); return json(response, 200, { users: auth.data.users.map(publicUser) }) }
  if (request.method === 'PATCH' && /^\/api\/admin\/employees\/[a-f0-9]+\/role$/.test(url.pathname)) { const auth = await authorizedUser(request); if (auth?.user?.role !== 'admin') return json(response, 403, { message: 'Only admins can change employee roles.' }); const input = await body(request), id = url.pathname.split('/')[4], employee = auth.data.users.find((entry) => entry.id === id); if (!employee) return json(response, 404, { message: 'Employee not found.' }); if (!roles.has(input?.role)) return json(response, 400, { message: 'Role must be employee, department_head, or asset_manager.' }); employee.role = input.role; await save(auth.data); return json(response, 200, { user: publicUser(employee) }) }
  json(response, 404, { message: 'Route not found.' })
})
server.listen(port, () => console.log(`AssetNexsus API listening on http://localhost:${port}`))
