import { useMemo, useState } from 'react'

type AllocationStatus = 'Active' | 'Overdue' | 'Returned'
type TransferStatus = 'Requested' | 'Approved' | 'Re-allocated'

type Allocation = {
  id: string
  assetTag: string
  assetName: string
  holder: string
  holderType: 'Employee' | 'Department'
  department: string
  allocatedOn: string
  expectedReturnDate?: string
  status: AllocationStatus
  notes?: string
}

type Transfer = {
  id: string
  assetTag: string
  assetName: string
  from: string
  to: string
  requestedBy: string
  approvedBy?: string
  status: TransferStatus | 'Denied'
  history: string[]
}

const initialAllocations: Allocation[] = [
  { id: 'a1', assetTag: 'AF-0114', assetName: 'Dell XPS 15 Laptop', holder: 'Priya Sharma', holderType: 'Employee', department: 'Human Resources', allocatedOn: '2024-01-15', expectedReturnDate: '2025-01-15', status: 'Overdue', notes: 'Top cover scratch; needs battery check' },
  { id: 'a2', assetTag: 'AF-0002', assetName: 'MacBook Pro M3', holder: 'Kavya Nair', holderType: 'Employee', department: 'Marketing', allocatedOn: '2024-02-20', expectedReturnDate: '2025-02-20', status: 'Active' },
  { id: 'a3', assetTag: 'AF-0007', assetName: 'Standing Desk — Ergonomic', holder: 'Ananya Das', holderType: 'Employee', department: 'Information Technology', allocatedOn: '2024-01-30', expectedReturnDate: '2025-01-30', status: 'Active' },
  { id: 'a4', assetTag: 'AF-0011', assetName: 'iPad Pro 12.9"', holder: 'Rohan Gupta', holderType: 'Employee', department: 'Finance', allocatedOn: '2024-04-05', expectedReturnDate: '2025-04-05', status: 'Active' },
  { id: 'a5', assetTag: 'AF-0004', assetName: 'Toyota Innova Crysta', holder: 'Operations Pool', holderType: 'Department', department: 'Operations', allocatedOn: '2022-06-01', expectedReturnDate: '2025-06-01', status: 'Active' },
]

const initialTransfers: Transfer[] = [
  { id: 't1', assetTag: 'AF-0114', assetName: 'Dell XPS 15 Laptop', from: 'Priya Sharma', to: 'Raj Mehta', requestedBy: 'Raj Mehta', approvedBy: 'M. Shah', status: 'Re-allocated', history: ['Requested by Raj Mehta', 'Approved by Asset Manager', 'Re-allocated to Raj Mehta'] },
  { id: 't2', assetTag: 'AF-0002', assetName: 'MacBook Pro M3', from: 'Kavya Nair', to: 'Product Design', requestedBy: 'Kavya Nair', approvedBy: 'A. Verma', status: 'Approved', history: ['Requested by Kavya Nair', 'Approved by Department Head'] },
]

const conditionOptions = ['Good', 'Minor wear', 'Needs inspection', 'Damaged']

function isOverdue(expectedReturnDate?: string) {
  if (!expectedReturnDate) return false
  return expectedReturnDate < '2026-07-12'
}

function allocationTone(status: AllocationStatus) {
  return status === 'Active' ? 'teal' : status === 'Overdue' ? 'rose' : 'slate'
}

function transferTone(status: TransferStatus | 'Denied') {
  return status === 'Requested' ? 'purple' : status === 'Approved' ? 'teal' : status === 'Re-allocated' ? 'slate' : 'rose'
}

export function AllocationTransfer() {
  const [allocations, setAllocations] = useState(initialAllocations)
  const [transfers, setTransfers] = useState(initialTransfers)
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'new'>('active')
  const [selectedAssetTag, setSelectedAssetTag] = useState('AF-0114')
  const [allocTo, setAllocTo] = useState('Raj Mehta')
  const [allocType, setAllocType] = useState<'Employee' | 'Department'>('Employee')
  const [allocDepartment, setAllocDepartment] = useState('Operations')
  const [expectedReturnDate, setExpectedReturnDate] = useState('2025-01-15')
  const [requestor, setRequestor] = useState('Raj Mehta')
  const [returnCondition, setReturnCondition] = useState('Good')
  const [returnNotes, setReturnNotes] = useState('')
  const [notice, setNotice] = useState('')

  const selectedAllocation = allocations.find((item) => item.assetTag === selectedAssetTag) ?? allocations[0]
  const activeAllocations = useMemo(() => allocations.filter((item) => item.status !== 'Returned'), [allocations])
  const overdueAllocations = useMemo(() => allocations.filter((item) => item.status === 'Overdue' || isOverdue(item.expectedReturnDate)), [allocations])
  const activeCount = activeAllocations.filter((item) => item.status === 'Active').length
  const returnedCount = allocations.filter((item) => item.status === 'Returned').length
  const requestedTransfers = transfers.filter((item) => item.status === 'Requested').length

  const alertFeed = useMemo(() => overdueAllocations.map((item) => ({
    title: `${item.assetTag} overdue`,
    detail: `${item.assetName} is currently held by ${item.holder}.`,
  })), [overdueAllocations])

  const handleAllocate = () => {
    const conflict = allocations.find((item) => item.assetTag === selectedAssetTag && item.status !== 'Returned')
    if (conflict) {
      setNotice(`${selectedAllocation.assetName} is currently held by ${conflict.holder}. Use Transfer Request instead.`)
      setActiveTab('active')
      return
    }

    const nextAllocation: Allocation = {
      id: crypto.randomUUID(),
      assetTag: selectedAssetTag,
      assetName: selectedAllocation.assetName,
      holder: allocTo,
      holderType: allocType,
      department: allocDepartment,
      allocatedOn: '2026-07-12',
      expectedReturnDate: expectedReturnDate || undefined,
      status: isOverdue(expectedReturnDate) ? 'Overdue' : 'Active',
    }

    setAllocations((current) => [nextAllocation, ...current.filter((item) => item.assetTag !== selectedAssetTag)])
    setNotice(`Allocated ${nextAllocation.assetName} to ${nextAllocation.holder}.`)
    setActiveTab('active')
  }

  const handleTransferRequest = () => {
    const currentHolder = allocations.find((item) => item.assetTag === selectedAssetTag && item.status !== 'Returned')
    if (!currentHolder) {
      setNotice('No active holder found. Allocate the asset first.')
      return
    }
    if (currentHolder.holder === requestor) {
      setNotice('This asset is already held by the same user. Choose a different transfer target.')
      return
    }

    const transfer: Transfer = {
      id: crypto.randomUUID(),
      assetTag: currentHolder.assetTag,
      assetName: currentHolder.assetName,
      from: currentHolder.holder,
      to: requestor,
      requestedBy: requestor,
      status: 'Requested',
      history: [`Requested by ${requestor}`],
    }

    setTransfers((current) => [transfer, ...current])
    setNotice(`Transfer request created for ${transfer.assetTag}.`)
    setActiveTab('history')
  }

  const handleApproveTransfer = (transferId: string) => {
    setTransfers((current) => current.map((transfer) => {
      if (transfer.id !== transferId) return transfer
      const approvedBy = 'Asset Manager'
      const nextHistory = [...transfer.history, `Approved by ${approvedBy}`, `Re-allocated to ${transfer.to}`]
      setAllocations((items) => items.map((item) => item.assetTag === transfer.assetTag && item.status !== 'Returned'
        ? { ...item, holder: transfer.to, holderType: 'Employee', department: 'Transferred', status: 'Active', expectedReturnDate: item.expectedReturnDate }
        : item))
      return { ...transfer, approvedBy, status: 'Re-allocated', history: nextHistory }
    }))
    setNotice('Transfer approved and allocation history updated.')
  }

  const handleReturn = () => {
    setAllocations((current) => current.map((item) => item.assetTag === selectedAssetTag && item.status !== 'Returned'
      ? { ...item, status: 'Returned', notes: `${returnCondition} · ${returnNotes}`.trim() }
      : item))
    setNotice(`${selectedAllocation.assetTag} marked returned. Asset status is now Available.`)
    setActiveTab('history')
  }

  return (
    <section className="allocation-page">
      <header className="allocation-header">
        <div>
          <p className="eyebrow">ASSET CONTROL</p>
          <h1>Allocation & Transfer</h1>
          <p>Manage asset assignments, transfers, and returns with explicit conflict handling.</p>
        </div>
        <button type="button" className="allocation-primary" onClick={() => setActiveTab('new')}>+ Allocate Asset</button>
      </header>

      <div className="allocation-stats">
        <article>
          <span>Active allocations</span>
          <strong>{activeCount}</strong>
          <small>Currently in use</small>
        </article>
        <article>
          <span>Overdue assets</span>
          <strong>{overdueAllocations.length}</strong>
          <small>Flagged for follow-up</small>
        </article>
        <article>
          <span>Transfer requests</span>
          <strong>{requestedTransfers}</strong>
          <small>Awaiting approval</small>
        </article>
        <article>
          <span>Returned assets</span>
          <strong>{returnedCount}</strong>
          <small>Back in inventory</small>
        </article>
      </div>

      {notice && <div className="allocation-banner"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <div className="allocation-tabs">
        <button type="button" className={activeTab === 'active' ? 'selected' : ''} onClick={() => setActiveTab('active')}>Active Allocations</button>
        <button type="button" className={activeTab === 'history' ? 'selected' : ''} onClick={() => setActiveTab('history')}>Return History</button>
        <button type="button" className={activeTab === 'new' ? 'selected' : ''} onClick={() => setActiveTab('new')}>New Allocation</button>
      </div>

      {activeTab === 'active' && (
        <div className="allocation-list">
          {activeAllocations.map((item) => (
            <article key={item.id} className={`allocation-card ${allocationTone(item.status)}`}>
              <div>
                <small>{item.assetTag}</small>
                <h3>{item.assetName}</h3>
                {item.notes && <p>{item.notes}</p>}
              </div>
              <div>
                <span>Assigned To</span>
                <strong>{item.holder}</strong>
                <small>{item.department}</small>
              </div>
              <div>
                <span>Allocated</span>
                <strong>{item.allocatedOn}</strong>
                <small>{item.expectedReturnDate ? `Return: ${item.expectedReturnDate}` : 'No return date set'}</small>
              </div>
              <div className={`allocation-status ${allocationTone(item.status)}`}>{item.status}</div>
              <div className="allocation-actions">
                <button type="button" onClick={() => { setSelectedAssetTag(item.assetTag); setRequestor(item.holder); setActiveTab('new') }}>Return</button>
                <button type="button" onClick={() => { setSelectedAssetTag(item.assetTag); setRequestor('Raj Mehta'); setActiveTab('new') }}>Transfer</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="allocation-history">
          {transfers.map((transfer) => (
            <article key={transfer.id} className={`history-card ${transferTone(transfer.status)}`}>
              <div>
                <small>{transfer.assetTag}</small>
                <h3>{transfer.assetName}</h3>
                <p>{transfer.from} → {transfer.to}</p>
              </div>
              <div className={`allocation-status ${transferTone(transfer.status)}`}>{transfer.status}</div>
              <div className="allocation-actions">
                {transfer.status === 'Requested' && <button type="button" onClick={() => handleApproveTransfer(transfer.id)}>Approve</button>}
              </div>
              <ul>
                {transfer.history.map((entry) => <li key={entry}>{entry}</li>)}
              </ul>
              {transfer.approvedBy && <p className="history-footnote">Approved by {transfer.approvedBy}</p>}
            </article>
          ))}
          <article className="history-card slate">
            <div>
              <small>Dashboard + Notifications feed</small>
              <h3>Overdue allocations</h3>
              <p>Items past expected return date are flagged automatically.</p>
            </div>
            <div className="allocation-actions">
              <span className="allocation-status rose">{overdueAllocations.length} overdue</span>
            </div>
            <ul>
              {alertFeed.map((item) => <li key={item.title}>{item.title}: {item.detail}</li>)}
            </ul>
          </article>
        </div>
      )}

      {activeTab === 'new' && (
        <div className="allocation-grid">
          <section className="allocation-panel">
            <h2>New Allocation</h2>
            <label>
              Asset Tag / Search
              <input value={selectedAssetTag} onChange={(event) => setSelectedAssetTag(event.target.value)} placeholder="e.g. AF-0114 or Dell XPS" />
            </label>
            <label>
              Assign To (Employee/Department)
              <input value={allocTo} onChange={(event) => setAllocTo(event.target.value)} placeholder="Search employee or department" />
            </label>
            <div className="allocation-double">
              <label>
                Type
                <select value={allocType} onChange={(event) => setAllocType(event.target.value as 'Employee' | 'Department')}>
                  <option>Employee</option>
                  <option>Department</option>
                </select>
              </label>
              <label>
                Expected Return Date
                <input type="date" value={expectedReturnDate} onChange={(event) => setExpectedReturnDate(event.target.value)} />
              </label>
            </div>
            <label>
              Notes
              <input value={allocDepartment} onChange={(event) => setAllocDepartment(event.target.value)} placeholder="Department / allocation notes" />
            </label>
            <button type="button" className="allocation-submit" onClick={handleAllocate}>Allocate Asset</button>
          </section>

          <section className="allocation-panel">
            <h2>Conflict Handling</h2>
            <p>If an asset is already allocated, the system blocks re-allocation and shows the current holder, offering a Transfer Request instead.</p>
            {selectedAllocation.status !== 'Returned' && (
              <div className="conflict-box">
                <strong>{selectedAllocation.assetTag}</strong>
                <span>Currently held by {selectedAllocation.holder}</span>
                <button type="button" className="allocation-secondary" onClick={handleTransferRequest}>Transfer Request</button>
              </div>
            )}
            <div className="return-box">
              <h3>Return flow</h3>
              <label>
                Condition check-in
                <select value={returnCondition} onChange={(event) => setReturnCondition(event.target.value)}>
                  {conditionOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                Notes
                <input value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} placeholder="Capture condition check-in notes" />
              </label>
              <button type="button" className="allocation-secondary" onClick={handleReturn}>Mark Returned</button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}