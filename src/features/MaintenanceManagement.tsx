import { useMemo, useState } from 'react'

type MaintenanceStatus = 'Pending' | 'Approved' | 'Rejected' | 'Technician Assigned' | 'In Progress' | 'Resolved'

type MaintenanceItem = {
  id: string
  assetTag: string
  assetName: string
  raisedBy: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  status: MaintenanceStatus
  assetStatus: 'Available' | 'Under Maintenance'
  issue: string
  raisedOn: string
  assignedTo?: string
  history: string[]
}

const initialItems: MaintenanceItem[] = [
  { id: 'm1', assetTag: 'AF-0006', assetName: 'Cisco Catalyst 9300 Switch', raisedBy: 'Arjun Mehta', priority: 'Critical', status: 'In Progress', assetStatus: 'Under Maintenance', issue: 'Switch experiencing packet drops on ports 24-32. Network performance degraded 40% on IT floor.', raisedOn: '2026-07-08', assignedTo: 'Network Team', history: ['Pending review', 'Approved by Asset Manager', 'Technician assigned', 'In progress'] },
  { id: 'm2', assetTag: 'AF-0003', assetName: 'HP LaserJet Pro', raisedBy: 'Meera Iyer', priority: 'Medium', status: 'Approved', assetStatus: 'Under Maintenance', issue: 'Printer feed rollers worn out and paper jams frequently.', raisedOn: '2026-07-09', assignedTo: 'Print Services', history: ['Pending review', 'Approved by Asset Manager'] },
  { id: 'm3', assetTag: 'AF-0004', assetName: 'Toyota Innova Crysta', raisedBy: 'Rahul Verma', priority: 'High', status: 'Pending', assetStatus: 'Available', issue: 'AC cooling issue and dashboard indicator intermittently flashes.', raisedOn: '2026-07-10', history: ['Pending review'] },
  { id: 'm4', assetTag: 'AF-0009', assetName: 'Dell PowerEdge R750', raisedBy: 'Arjun Mehta', priority: 'Low', status: 'Resolved', assetStatus: 'Available', issue: 'Rack fan noise abnormal during peak hours.', raisedOn: '2026-07-02', assignedTo: 'Data Center Ops', history: ['Pending review', 'Approved by Asset Manager', 'Technician assigned', 'In progress', 'Resolved'] },
]

const workflowSteps: MaintenanceStatus[] = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved']

const priorityTone: Record<MaintenanceItem['priority'], string> = {
  Low: 'slate',
  Medium: 'purple',
  High: 'orange',
  Critical: 'rose',
}

const statusTone: Record<MaintenanceStatus, string> = {
  Pending: 'orange',
  Approved: 'teal',
  Rejected: 'rose',
  'Technician Assigned': 'purple',
  'In Progress': 'purple',
  Resolved: 'teal',
}

function historyLabel(status: MaintenanceStatus) {
  if (status === 'Technician Assigned') return 'Technician assigned'
  if (status === 'In Progress') return 'In progress'
  return status
}

export function MaintenanceManagement() {
  const [items, setItems] = useState(initialItems)
  const [activeFilter, setActiveFilter] = useState<'All' | MaintenanceStatus | 'Rejected'>('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [assetTag, setAssetTag] = useState('AF-0006')
  const [issue, setIssue] = useState('Describe the problem in detail...')
  const [priority, setPriority] = useState<MaintenanceItem['priority']>('Low')
  const [photoName, setPhotoName] = useState('')
  const [notice, setNotice] = useState('')

  const total = items.length
  const pendingCount = items.filter((item) => item.status === 'Pending').length
  const inProgressCount = items.filter((item) => item.status === 'In Progress').length
  const resolvedCount = items.filter((item) => item.status === 'Resolved').length

  const visibleItems = useMemo(() => {
    if (activeFilter === 'All') return items
    return items.filter((item) => item.status === activeFilter)
  }, [activeFilter, items])

  const approvedOnes = items.filter((item) => item.status === 'Approved' || item.status === 'Technician Assigned' || item.status === 'In Progress')

  const handleRaiseRequest = () => {
    const next: MaintenanceItem = {
      id: crypto.randomUUID(),
      assetTag,
      assetName: assetTag === 'AF-0006' ? 'Cisco Catalyst 9300 Switch' : 'New Asset',
      raisedBy: 'Arjun Mehta',
      priority,
      status: 'Pending',
      assetStatus: 'Available',
      issue,
      raisedOn: '2026-07-12',
      history: ['Pending review'],
    }
    setItems((current) => [next, ...current])
    setNotice(`Request raised for ${next.assetTag}${photoName ? ` with ${photoName}` : ''}.`)
    setDialogOpen(false)
    setPhotoName('')
  }

  const advanceStatus = (id: string) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item
      if (item.status === 'Pending') return { ...item, status: 'Approved', assetStatus: 'Under Maintenance', history: [...item.history, 'Approved by Asset Manager', 'Asset status set to Under Maintenance'] }
      if (item.status === 'Approved') return { ...item, status: 'Technician Assigned', assignedTo: item.assignedTo ?? 'Technician Team', history: [...item.history, 'Technician assigned'] }
      if (item.status === 'Technician Assigned') return { ...item, status: 'In Progress', history: [...item.history, 'Work started'] }
      if (item.status === 'In Progress') return { ...item, status: 'Resolved', assetStatus: 'Available', history: [...item.history, 'Resolved', 'Asset status set to Available'] }
      return item
    }))
    setNotice('Maintenance workflow advanced and asset status updated accordingly.')
  }

  const markRejected = (id: string) => {
      setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'Rejected', assetStatus: 'Available', history: [...item.history, 'Rejected by Asset Manager', 'Asset status remains Available'] } : item))
    setNotice('Request rejected by Asset Manager.')
  }

  return (
    <section className="maintenance-page">
      <header className="maintenance-header">
        <div>
          <p className="eyebrow">ASSET CARE</p>
          <h1>Maintenance Management</h1>
          <p>Approval-gated repair workflow for all assets</p>
        </div>
        <button type="button" className="maintenance-primary" onClick={() => setDialogOpen(true)}>+ Raise Request</button>
      </header>

      <div className="maintenance-stats">
        <article><strong>{total}</strong><span>Total Requests</span></article>
        <article><strong>{pendingCount}</strong><span>Pending Approval</span></article>
        <article><strong>{inProgressCount}</strong><span>In Progress</span></article>
        <article><strong>{resolvedCount}</strong><span>Resolved</span></article>
      </div>

      <section className="maintenance-workflow-card">
        <div className="workflow-label">Workflow:</div>
        <div className="workflow-pills">
          {workflowSteps.map((step) => <span key={step} className={`workflow-pill ${statusTone[step]}`}>{step}</span>)}
        </div>
        <p>Asset auto-updates to “Under Maintenance” on approval.</p>
      </section>

      {notice && <div className="maintenance-banner"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <div className="maintenance-filters">
        {(['All', 'Pending', 'Approved', 'In Progress', 'Resolved', 'Rejected'] as const).map((item) => (
          <button key={item} type="button" className={activeFilter === item ? 'selected' : ''} onClick={() => setActiveFilter(item)}>{item}</button>
        ))}
      </div>

      <div className="maintenance-list">
        {visibleItems.map((item) => (
          <article key={item.id} className={`maintenance-card ${priorityTone[item.priority]}`}>
            <div className="maintenance-leading">
              <span className="asset-dot" />
              <div>
                <small>{item.assetTag}</small>
                <h3>{item.assetName}</h3>
                <p>{item.issue}</p>
              </div>
            </div>
            <div className="maintenance-meta">
              <div><span>Raised by</span><strong>{item.raisedBy}</strong></div>
              <div><span>Priority</span><strong>{item.priority}</strong></div>
                <div><span>Asset status</span><strong>{item.assetStatus}</strong></div>
            </div>
            <div className={`maintenance-status ${statusTone[item.status]}`}>{item.status}</div>
            <div className="maintenance-actions">
              {item.status !== 'Resolved' && item.status !== 'Rejected' && <button type="button" onClick={() => advanceStatus(item.id)}>{item.status === 'Pending' ? 'Approve' : item.status === 'Approved' ? 'Assign Technician' : item.status === 'Technician Assigned' ? 'Start Work' : 'Mark Resolved'}</button>}
              {item.status === 'Pending' && <button type="button" onClick={() => markRejected(item.id)}>Reject</button>}
            </div>
          </article>
        ))}
      </div>

      <section className="maintenance-history-card">
        <div className="maintenance-history-head">
          <strong>Maintenance history by asset</strong>
          <span>History retained per asset</span>
        </div>
        <div className="maintenance-history-list">
          {approvedOnes.map((item) => (
            <article key={item.id} className="maintenance-history-item">
              <div>
                <small>{item.assetTag}</small>
                <strong>{item.assetName}</strong>
                <span>{item.assignedTo ?? 'Unassigned'} · {item.raisedOn}</span>
              </div>
              <div className={`maintenance-status ${statusTone[item.status]}`}>{historyLabel(item.status)}</div>
              <ul>{item.history.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      {dialogOpen && (
        <div className="maintenance-modal-backdrop" role="presentation" onClick={() => setDialogOpen(false)}>
          <div className="maintenance-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="maintenance-modal-header">
              <div>
                <p className="eyebrow">MAINTENANCE</p>
                <h2 id="maintenance-modal-title">Raise Maintenance Request</h2>
              </div>
              <button type="button" className="maintenance-modal-close" onClick={() => setDialogOpen(false)} aria-label="Close dialog">×</button>
            </div>
            <div className="maintenance-modal-body">
              <label>
                Asset Tag
                <input value={assetTag} onChange={(event) => setAssetTag(event.target.value)} placeholder="e.g. AF-0006" />
              </label>
              <label>
                Issue Description
                <textarea value={issue} onChange={(event) => setIssue(event.target.value)} placeholder="Describe the problem in detail..." />
              </label>
              <label>
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as MaintenanceItem['priority'])}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>
              <label>
                Attach Photo
                <input value={photoName} onChange={(event) => setPhotoName(event.target.value)} placeholder="Optional photo filename" />
              </label>
              <div className="maintenance-modal-actions">
                <button type="button" className="maintenance-secondary" onClick={() => setDialogOpen(false)}>Cancel</button>
                <button type="button" className="maintenance-submit" onClick={handleRaiseRequest}>Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}