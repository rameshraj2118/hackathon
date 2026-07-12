import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../services/dataApi'

type Notification = { id: string; title: string; detail: string; tone: string; read: boolean; occurredAt: string }
type AuditLog = { id: string; actor: string; action: string; detail: string; entity: string; occurredAt: string }
type Allocation = { assetTag: string; assetName: string; holder: string; expectedReturnDate?: string; status: string }
type Booking = { id: string; resourceId: string; person: string; date: string; start: string; status: string }

export function Notifications() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [notice, setNotice] = useState('')
  useEffect(() => { if (!token) return; Promise.all([dataApi.list<Notification>('notifications', token), dataApi.list<AuditLog>('audit_logs', token), dataApi.list<Allocation>('allocations', token), dataApi.list<Booking>('bookings', token)]).then(([notificationData, logData, allocationData, bookingData]) => { setNotifications(notificationData.notifications); setLogs(logData.audit_logs); setAllocations(allocationData.allocations); setBookings(bookingData.bookings) }).catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Unable to load notifications.')) }, [token])
  const overdue = useMemo(() => allocations.filter((item) => item.status !== 'Returned' && item.expectedReturnDate && item.expectedReturnDate < new Date().toISOString().slice(0, 10)).map((item) => ({ id: `overdue-${item.assetTag}`, title: 'Overdue Return Alert', detail: `${item.assetName} (${item.assetTag}) is still held by ${item.holder}.`, tone: 'rose', read: false, occurredAt: item.expectedReturnDate! })), [allocations])
  const reminders = useMemo(() => { const now = Date.now(), soon = now + 30 * 60 * 1000; return bookings.filter((item) => item.status === 'Upcoming' && new Date(`${item.date}T${item.start}:00`).getTime() >= now && new Date(`${item.date}T${item.start}:00`).getTime() <= soon).map((item) => ({ id: `reminder-${item.id}`, title: 'Booking Reminder', detail: `${item.resourceId} starts for ${item.person} at ${item.start}.`, tone: 'purple', read: false, occurredAt: `${item.date}T${item.start}:00` })) }, [bookings])
  const allNotifications = [...overdue, ...reminders, ...notifications].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  const markRead = async (item: Notification) => { if (!token || item.id.startsWith('overdue-') || item.read) return; const updated = { ...item, read: true }; try { await dataApi.save('notifications', updated, token); setNotifications((current) => current.map((entry) => entry.id === item.id ? updated : entry)) } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Unable to update notification.') } }
  return <section className="notifications-page"><header className="notifications-header"><div><p className="eyebrow">OPERATIONS FEED</p><h1>Activity Logs & Notifications</h1><p>Workflow updates, alerts, and a complete record of actions across the platform.</p></div><span>{allNotifications.filter((item) => !item.read).length} unread</span></header>{notice && <div className="notifications-notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}<div className="notifications-layout"><section className="notifications-card"><div className="notifications-title"><h2>Notifications</h2><small>Latest workflow alerts</small></div>{allNotifications.length ? allNotifications.map((item) => <button className={`notification-row ${item.read ? 'read' : ''} ${item.tone}`} key={item.id} onClick={() => markRead(item)}><i/><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.occurredAt.slice(0, 10)}</time></button>) : <p className="notifications-empty">No notifications yet.</p>}</section><section className="notifications-card"><div className="notifications-title"><h2>Audit log</h2><small>Who did what, and when</small></div>{logs.length ? logs.map((log) => <article className="audit-log-row" key={log.id}><div><strong>{log.actor}</strong><span>{log.action}</span><p>{log.detail}</p></div><time>{new Date(log.occurredAt).toLocaleString()}</time></article>) : <p className="notifications-empty">Actions will appear here as workflows are used.</p>}</section></div></section>
}
