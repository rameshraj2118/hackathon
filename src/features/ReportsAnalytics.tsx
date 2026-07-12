import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { dataApi } from '../services/dataApi'

type Asset = { tag: string; name: string; category: string; department?: string; status: string; acquired?: string }
type Allocation = { assetTag: string; department: string; status: string }
type Booking = { resourceId: string; date: string; start: string; status: string }
type Maintenance = { assetTag: string; status: string; raisedOn?: string }

const monthNames = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17']
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const linePath = (values: number[]) => { const max = Math.max(...values, 1); return values.map((value, index) => `${index ? 'L' : 'M'} ${22 + index * 74} ${103 - value / max * 76}`).join(' ') }

export function ReportsAnalytics() {
  const { token } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [maintenance, setMaintenance] = useState<Maintenance[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    Promise.all([dataApi.list<Asset>('assets', token), dataApi.list<Allocation>('allocations', token), dataApi.list<Booking>('bookings', token), dataApi.list<Maintenance>('maintenance', token)])
      .then(([assetData, allocationData, bookingData, maintenanceData]) => {
        setAssets(assetData.assets); setAllocations(allocationData.allocations); setBookings(bookingData.bookings); setMaintenance(maintenanceData.maintenance)
      })
      .catch((reason) => setNotice(reason instanceof Error ? reason.message : 'Unable to load report data.'))
  }, [token])

  const activeAllocations = allocations.filter((item) => item.status !== 'Returned')
  const usage = useMemo(() => assets.map((asset) => ({ asset, score: activeAllocations.filter((item) => item.assetTag === asset.tag).length + bookings.filter((item) => item.resourceId === asset.tag || item.resourceId === asset.tag.toLowerCase()).length })), [assets, activeAllocations, bookings])
  const mostUsed = [...usage].sort((a, b) => b.score - a.score).slice(0, 8)
  const idle = usage.filter((item) => item.score === 0 && item.asset.status === 'Available').slice(0, 4)
  const maintenanceByCategory = useMemo(() => Object.entries(maintenance.reduce<Record<string, number>>((counts, item) => { const category = assets.find((asset) => asset.tag === item.assetTag)?.category || 'Uncategorized'; counts[category] = (counts[category] || 0) + 1; return counts }, {})), [assets, maintenance])
  const dueAssets = assets.filter((asset) => asset.status === 'Under Maintenance' || (asset.acquired && asset.acquired < '2024-01-01'))
  const departmentSummary = useMemo(() => Object.entries(activeAllocations.reduce<Record<string, number>>((counts, item) => { counts[item.department || 'Unassigned'] = (counts[item.department || 'Unassigned'] || 0) + 1; return counts }, {})), [activeAllocations])
  const maintenanceTrend = useMemo(() => monthNames.map((_, index) => maintenance.filter((item) => new Date(`${item.raisedOn || '2026-07-01'}T00:00:00`).getMonth() === index + 1).length), [maintenance])
  const resolvedTrend = useMemo(() => monthNames.map((_, index) => maintenance.filter((item) => item.status === 'Resolved' && new Date(`${item.raisedOn || '2026-07-01'}T00:00:00`).getMonth() === index + 1).length), [maintenance])
  const statusDistribution = useMemo(() => Object.entries(assets.reduce<Record<string, number>>((counts, asset) => { counts[asset.status] = (counts[asset.status] || 0) + 1; return counts }, {})), [assets])
  const heatmap = useMemo(() => days.map((_, dayIndex) => hours.map((hour) => bookings.filter((booking) => { const date = new Date(`${booking.date}T00:00:00`); return booking.status !== 'Cancelled' && date.getDay() === dayIndex && booking.start.startsWith(hour) }).length)), [bookings])
  const maxUsage = Math.max(...mostUsed.map((item) => item.score), 1)

  const exportReport = () => {
    const rows = [['Report', 'Item', 'Value'], ['Assets', 'Total assets', String(assets.length)], ['Assets', 'Idle assets', String(idle.length)], ['Maintenance', 'Open requests', String(maintenance.filter((item) => item.status !== 'Resolved' && item.status !== 'Rejected').length)], ...departmentSummary.map(([department, count]) => ['Department allocations', department, String(count)]), ...maintenanceByCategory.map(([category, count]) => ['Maintenance frequency', category, String(count)])]
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'assetnexsus-analytics.csv'; link.click(); URL.revokeObjectURL(link.href)
    setNotice('Analytics report exported as CSV.')
  }

  return <section className="reports-page">
    <header className="reports-header"><div><p className="eyebrow">OPERATIONS INTELLIGENCE</p><h1>Reports & Analytics</h1><p>Live operational insight from assets, allocations, maintenance, and bookings.</p></div><button type="button" className="reports-export" onClick={exportReport}>Export CSV</button></header>
    {notice && <div className="reports-notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <div className="reports-metrics"><article><span>Assets tracked</span><strong>{assets.length}</strong></article><article><span>Active allocations</span><strong>{activeAllocations.length}</strong></article><article><span>Open maintenance</span><strong>{maintenance.filter((item) => !['Resolved', 'Rejected'].includes(item.status)).length}</strong></article><article><span>Bookings logged</span><strong>{bookings.length}</strong></article></div>
    <div className="analytics-layout">
      <article className="analytics-card utilization-card"><h2>Asset Utilization Ranking</h2>{mostUsed.map(({ asset, score }, index) => <div className="utilization-row" key={asset.tag}><small>{index + 1}</small><div><span>{asset.name}</span><i><b style={{ width: `${score / maxUsage * 100}%` }} /></i></div><strong>{score ? `${Math.round(score / maxUsage * 100)}%` : 'Idle'}</strong></div>)}</article>
      <article className="analytics-card department-card-report"><h2>Department Allocation Summary</h2><div className="allocation-bars">{departmentSummary.map(([department, count]) => <div key={department}><span>{department}</span><i><b style={{ width: `${count / Math.max(...departmentSummary.map((row) => row[1]), 1) * 100}%` }} /></i><small>{count}</small></div>)}</div></article>
      <article className="analytics-card trend-card"><h2>Maintenance Frequency Trend</h2><svg viewBox="0 0 400 130"><path className="trend-grid" d="M20 27H390M20 65H390M20 103H390"/><path className="trend-request" d={linePath(maintenanceTrend)}/><path className="trend-resolved" d={linePath(resolvedTrend)}/>{monthNames.map((month, index) => <text key={month} x={18 + index * 74} y="123">{month}</text>)}</svg><p className="trend-key"><i/>Requests <b/>Resolved</p></article>
      <article className="analytics-card distribution-card"><h2>Status Distribution</h2><div className="distribution-content"><i className="status-donut" style={{ background: `conic-gradient(#0f9386 0 ${assets.filter((asset) => asset.status === 'Available').length / Math.max(assets.length, 1) * 100}%,#14cdb8 ${assets.filter((asset) => asset.status === 'Available').length / Math.max(assets.length, 1) * 100}% 100%)` }} /> <div>{statusDistribution.map(([status, count]) => <p key={status}><b />{status}<span>{count}</span></p>)}</div></div></article>
    </div>
    <div className="reports-grid">
      <article className="reports-card"><h2>Most-used assets</h2>{mostUsed.map(({ asset, score }) => <p key={asset.tag}><span>{asset.name}</span><b>{score} uses</b></p>)}</article>
      <article className="reports-card"><h2>Idle assets</h2>{idle.length ? idle.map(({ asset }) => <p key={asset.tag}><span>{asset.name}</span><b>{asset.tag}</b></p>) : <p><span>No idle assets detected</span></p>}</article>
      <article className="reports-card"><h2>Maintenance by category</h2>{maintenanceByCategory.map(([category, count]) => <p key={category}><span>{category}</span><b>{count} requests</b></p>)}</article>
      <article className="reports-card"><h2>Due attention</h2>{dueAssets.length ? dueAssets.map((asset) => <p key={asset.tag}><span>{asset.name}</span><b>{asset.status === 'Under Maintenance' ? 'Maintenance due' : 'Retirement review'}</b></p>) : <p><span>No assets require attention</span></p>}</article>
      <article className="reports-card"><h2>Department allocation summary</h2>{departmentSummary.map(([department, count]) => <p key={department}><span>{department}</span><b>{count} allocated</b></p>)}</article>
      <article className="reports-card heatmap-report"><h2>Booking heatmap</h2><div className="report-hours">{hours.map((hour) => <small key={hour}>{hour}</small>)}</div>{heatmap.map((row, index) => <div className="report-heat-row" key={days[index]}><small>{days[index]}</small>{row.map((count, hour) => <i key={hour} style={{ opacity: Math.min(.18 + count * .28, 1) }} title={`${days[index]} ${hours[hour]}:00 — ${count} bookings`} />)}</div>)}</article>
    </div>
  </section>
}
