import { useMemo, useState } from 'react'

type AuditStatus = 'Active' | 'Closed'
type VerificationStatus = 'Verified' | 'Missing' | 'Damaged'

type AuditAsset = {
  id: string
  assetTag: string
  assetName: string
  status: VerificationStatus
  note?: string
}

type AuditCycle = {
  id: string
  name: string
  scope: string
  startDate: string
  endDate: string
  auditors: string[]
  status: AuditStatus
  progress: number
  verified: number
  missing: number
  damaged: number
  total: number
  assets: AuditAsset[]
  history: string[]
}

const initialCycles: AuditCycle[] = [
  {
    id: 'c1',
    name: 'IT Assets Q2 2026',
    scope: 'Information Technology',
    startDate: '2026-07-01',
    endDate: '2026-07-15',
    auditors: ['Rahul', 'Sneha', 'Priya'],
    status: 'Active',
    progress: 38,
    verified: 21,
    missing: 2,
    damaged: 1,
    total: 43,
    assets: [
      { id: 'a1', assetTag: 'AF-0001', assetName: 'Dell XPS 15 Laptop', status: 'Verified' },
      { id: 'a2', assetTag: 'AF-0002', assetName: 'MacBook Pro M3', status: 'Verified' },
      { id: 'a3', assetTag: 'AF-0005', assetName: 'Conference Room A — Projector', status: 'Verified' },
      { id: 'a4', assetTag: 'AF-0007', assetName: 'Standing Desk — Ergonomic', status: 'Verified' },
      { id: 'a5', assetTag: 'AF-0009', assetName: 'Dell PowerEdge R750', status: 'Missing', note: 'Not located at rack 7B' },
      { id: 'a6', assetTag: 'AF-0011', assetName: 'iPad Pro 12.9"', status: 'Verified' },
      { id: 'a7', assetTag: 'AF-0013', assetName: 'Logitech MX Master 3 (x6)', status: 'Damaged', note: '2 units with cracked casing' },
    ],
    history: ['Cycle created', 'Asset verification started', '2 assets flagged missing', '1 asset flagged damaged'],
  },
  {
    id: 'c2',
    name: 'Full Org Audit Q4 2025',
    scope: 'All Departments',
    startDate: '2025-12-01',
    endDate: '2025-12-20',
    auditors: ['Rohan', 'Meera', 'Priya'],
    status: 'Closed',
    progress: 100,
    verified: 335,
    missing: 4,
    damaged: 3,
    total: 342,
    assets: [],
    history: ['Cycle created', 'Discrepancy report generated', 'Cycle closed and assets updated'],
  },
  {
    id: 'c3',
    name: 'Vehicles & Facilities',
    scope: 'Operations + Facilities',
    startDate: '2026-06-15',
    endDate: '2026-06-25',
    auditors: ['Vikram', 'Asha'],
    status: 'Closed',
    progress: 100,
    verified: 21,
    missing: 0,
    damaged: 1,
    total: 22,
    assets: [],
    history: ['Cycle created', 'No missing assets found', 'Cycle closed'],
  },
]

function reportTone(status: VerificationStatus) {
  return status === 'Verified' ? 'teal' : status === 'Missing' ? 'rose' : 'orange'
}

function statusTone(status: AuditStatus) {
  return status === 'Active' ? 'teal' : 'slate'
}

function formatRange(startDate: string, endDate: string) {
  return `${new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(`${endDate}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function AuditCycles() {
  const [cycles, setCycles] = useState(initialCycles)
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycles[0].id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [cycleName, setCycleName] = useState('New Audit Cycle')
  const [scope, setScope] = useState('Department / Location')
  const [startDate, setStartDate] = useState('2026-07-12')
  const [endDate, setEndDate] = useState('2026-07-18')
  const [auditors, setAuditors] = useState('')

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId) ?? cycles[0]
  const discrepancyAssets = useMemo(() => selectedCycle.assets.filter((asset) => asset.status !== 'Verified'), [selectedCycle])

  const createCycle = () => {
    const next: AuditCycle = {
      id: crypto.randomUUID(),
      name: cycleName.trim() || 'New Audit Cycle',
      scope,
      startDate,
      endDate,
      auditors: auditors.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'Active',
      progress: 0,
      verified: 0,
      missing: 0,
      damaged: 0,
      total: 0,
      assets: [],
      history: ['Cycle created'],
    }
    setCycles((current) => [next, ...current])
    setSelectedCycleId(next.id)
    setDialogOpen(false)
    setNotice(`Created ${next.name} for ${next.scope}.`)
  }

  const closeCycle = () => {
    setCycles((current) => current.map((cycle) => {
      if (cycle.id !== selectedCycle.id || cycle.status === 'Closed') return cycle
      const updatedAssets = cycle.assets.map((asset) => asset.status === 'Missing' ? { ...asset, note: `${asset.note ?? ''} Confirmed missing on close.`.trim() } : asset)
      return { ...cycle, status: 'Closed', progress: 100, assets: updatedAssets, history: [...cycle.history, 'Cycle closed', 'Missing assets flagged Lost'] }
    }))
    setNotice('Audit cycle closed. Confirmed missing items are marked Lost.')
  }

  return (
    <section className="audit-page">
      <header className="audit-header">
        <div>
          <p className="eyebrow">ASSET CONTROL</p>
          <h1>Asset Audit Cycles</h1>
          <p>Structured verification with auto-generated discrepancy reports</p>
        </div>
        <button type="button" className="audit-primary" onClick={() => setDialogOpen(true)}>+ New Audit Cycle</button>
      </header>

      {notice && <div className="audit-banner"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <div className="audit-layout">
        <aside className="audit-sidebar">
          <div className="audit-label">Audit Cycles</div>
          <div className="audit-cycle-list">
            {cycles.map((cycle) => (
              <button key={cycle.id} type="button" className={`audit-cycle-card ${selectedCycle.id === cycle.id ? 'active' : ''}`} onClick={() => setSelectedCycleId(cycle.id)}>
                <div>
                  <strong>{cycle.name}</strong>
                  <span>{cycle.scope}</span>
                  <small>{formatRange(cycle.startDate, cycle.endDate)}</small>
                </div>
                <div className={`audit-status ${statusTone(cycle.status)}`}>{cycle.status}</div>
                <div className="audit-counts"><span>✓ {cycle.verified}</span><span>× {cycle.missing}</span><span>⚠ {cycle.damaged}</span><b>/ {cycle.total || cycle.verified + cycle.missing + cycle.damaged}</b></div>
              </button>
            ))}
          </div>
        </aside>

        <main className="audit-main">
          <section className="audit-overview-card">
            <div className="audit-overview-head">
              <div>
                <h2>{selectedCycle.name}</h2>
                <p>{selectedCycle.scope}</p>
              </div>
              <div className="audit-auditors">{selectedCycle.auditors.map((auditor) => <span key={auditor}>{auditor}</span>)}</div>
            </div>
            <div className="audit-progress-row">
              <div className="audit-progress-label">Progress</div>
              <div className="audit-progress-value">{selectedCycle.progress} / 100</div>
            </div>
            <div className="audit-progress-bar"><i style={{ width: `${selectedCycle.progress}%` }} /></div>
            <div className="audit-summary-pills">
              <span className="verified">Verified: {selectedCycle.verified}</span>
              <span className="missing">Missing: {selectedCycle.missing}</span>
              <span className="damaged">Damaged: {selectedCycle.damaged}</span>
            </div>
            {selectedCycle.status === 'Active' && <button type="button" className="audit-close-button" onClick={closeCycle}>Close Audit Cycle</button>}
          </section>

          <section className="audit-report-card">
            <div className="audit-report-head">
              <div>
                <p className="audit-mini-label">Discrepancy Report</p>
                <h3>Cycle {selectedCycle.status}</h3>
              </div>
              <span>Auto-generated from flagged items</span>
            </div>
            <div className="audit-report-metrics">
              <article><strong>{selectedCycle.assets.length || selectedCycle.total}</strong><span>Total Audited</span></article>
              <article><strong>{selectedCycle.verified}</strong><span>Verified</span></article>
              <article><strong>{discrepancyAssets.length}</strong><span>Discrepancies</span></article>
            </div>
          </section>

          <section className="audit-verification-card">
            <div className="audit-section-head">
              <strong>Asset Verification</strong>
              <span>Verified / Missing / Damaged</span>
            </div>
            <div className="audit-asset-list">
              {(selectedCycle.assets.length ? selectedCycle.assets : [
                { id: 'placeholder-1', assetTag: 'AF-0001', assetName: 'Dell XPS 15 Laptop', status: 'Verified' as VerificationStatus },
                { id: 'placeholder-2', assetTag: 'AF-0009', assetName: 'Dell PowerEdge R750', status: 'Missing' as VerificationStatus },
                { id: 'placeholder-3', assetTag: 'AF-0013', assetName: 'Logitech MX Master 3 (x6)', status: 'Damaged' as VerificationStatus },
              ]).map((asset) => (
                <div key={asset.id} className={`audit-asset-row ${reportTone(asset.status)}`}>
                  <div className="audit-asset-left">
                    <span className="audit-dot" />
                    <div>
                      <small>{asset.assetTag}</small>
                      <strong>{asset.assetName}</strong>
                    </div>
                  </div>
                  <div className={`audit-pill ${reportTone(asset.status)}`}>{asset.status}</div>
                  <div className="audit-asset-actions">
                    <button type="button" className={asset.status === 'Verified' ? 'selected' : ''}>Verified</button>
                    <button type="button" className={asset.status === 'Missing' ? 'selected' : ''}>Missing</button>
                    <button type="button" className={asset.status === 'Damaged' ? 'selected' : ''}>Damaged</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="audit-history-card">
            <div className="audit-section-head">
              <strong>Audit history</strong>
              <span>Retained per cycle</span>
            </div>
            <ul>
              {selectedCycle.history.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </section>
        </main>
      </div>

      {dialogOpen && (
        <div className="audit-modal-backdrop" role="presentation" onClick={() => setDialogOpen(false)}>
          <div className="audit-modal" role="dialog" aria-modal="true" aria-labelledby="audit-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="audit-modal-header">
              <div>
                <p className="eyebrow">AUDIT</p>
                <h2 id="audit-modal-title">New Audit Cycle</h2>
              </div>
              <button type="button" className="audit-modal-close" onClick={() => setDialogOpen(false)} aria-label="Close dialog">×</button>
            </div>
            <div className="audit-modal-body">
              <label>
                Cycle Name
                <input value={cycleName} onChange={(event) => setCycleName(event.target.value)} placeholder="IT Assets Q3 2026" />
              </label>
              <label>
                Scope (Department/Location)
                <input value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Information Technology" />
              </label>
              <div className="audit-modal-grid">
                <label>
                  Start Date
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </label>
                <label>
                  End Date
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </label>
              </div>
              <label>
                Assign Auditors
                <input value={auditors} onChange={(event) => setAuditors(event.target.value)} placeholder="Rahul, Sneha, Priya" />
              </label>
              <div className="audit-modal-actions">
                <button type="button" className="audit-secondary" onClick={() => setDialogOpen(false)}>Cancel</button>
                <button type="button" className="audit-submit" onClick={createCycle}>Create Cycle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}