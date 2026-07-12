import { useMemo, useState } from 'react'

type BookingStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled'

type Resource = {
  id: string
  code: string
  name: string
  area: string
  category: string
  status: 'Available' | 'Allocated' | 'Reserved'
}

type Booking = {
  id: string
  resourceId: string
  person: string
  department: string
  purpose: string
  date: string
  start: string
  end: string
  status: BookingStatus
}

const resources: Resource[] = [
  { id: 'meeting-b2', code: 'AF-0008', name: 'Meeting Room B2', area: 'Block B · Floor 2', category: 'Meeting Rooms', status: 'Reserved' },
  { id: 'projector-a', code: 'AF-0005', name: 'Conference Room A — Projector', area: 'Conference Room A', category: 'Electronics', status: 'Available' },
  { id: 'innova', code: 'AF-0004', name: 'Toyota Innova Crysta', area: 'Ground Parking', category: 'Vehicles', status: 'Allocated' },
  { id: 'oscilloscope', code: 'AF-0012', name: 'Oscilloscope — Rigol DS1054Z', area: 'Lab Room 3', category: 'Lab Equipment', status: 'Available' },
]

const weekdayLabels = ['Sat 12', 'Sun 13', 'Mon 14', 'Tue 15', 'Wed 16']
const hourLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const timelineStartMinutes = 8 * 60
const timelineSlotMinutes = 60
const timelineSlotHeight = 40

const initialBookings: Booking[] = [
  { id: 'b1', resourceId: 'meeting-b2', person: 'Priya Sharma', department: 'Human Resources', purpose: 'Quarterly HR review', date: '2026-07-14', start: '09:00', end: '10:30', status: 'Upcoming' },
  { id: 'b2', resourceId: 'meeting-b2', person: 'Arjun Mehta', department: 'Information Technology', purpose: 'Infrastructure planning', date: '2026-07-14', start: '11:00', end: '12:30', status: 'Upcoming' },
  { id: 'b3', resourceId: 'meeting-b2', person: 'Aarav Shah', department: 'Operations', purpose: 'Vendor call', date: '2026-07-13', start: '15:00', end: '16:00', status: 'Completed' },
  { id: 'b4', resourceId: 'innova', person: 'Rahul Verma', department: 'Operations', purpose: 'Site visit — Andheri warehouse', date: '2026-07-12', start: '08:00', end: '14:00', status: 'Ongoing' },
]

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function overlaps(existing: Booking, date: string, start: string, end: string) {
  if (existing.date !== date || existing.status === 'Cancelled') return false
  const requestedStart = minutes(start)
  const requestedEnd = minutes(end)
  const existingStart = minutes(existing.start)
  const existingEnd = minutes(existing.end)
  return requestedStart < existingEnd && requestedEnd > existingStart
}

function bookingStatusTone(status: BookingStatus) {
  return status === 'Upcoming' ? 'purple' : status === 'Ongoing' ? 'teal' : status === 'Completed' ? 'slate' : 'rose'
}

function statusMarker(status: Resource['status']) {
  return status === 'Available' ? 'teal' : status === 'Allocated' ? 'orange' : 'purple'
}

function dayOffsetIndex(date: string) {
  const reference = new Date('2026-07-12T00:00:00')
  const current = new Date(`${date}T00:00:00`)
  return Math.round((current.getTime() - reference.getTime()) / 86400000)
}

function bookingTopOffset(start: string) {
  return Math.max(0, ((minutes(start) - timelineStartMinutes) / timelineSlotMinutes) * timelineSlotHeight)
}

function bookingBlockHeight(start: string, end: string) {
  return Math.max(32, ((minutes(end) - minutes(start)) / timelineSlotMinutes) * timelineSlotHeight - 4)
}

export function ResourceBooking() {
  const [bookings, setBookings] = useState(initialBookings)
  const [selectedResourceId, setSelectedResourceId] = useState('meeting-b2')
  const [resourceId, setResourceId] = useState('meeting-b2')
  const [date, setDate] = useState('2026-07-14')
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('11:30')
  const [person, setPerson] = useState('')
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notice, setNotice] = useState('')
  const [isCreateOpen, setCreateOpen] = useState(false)

  const selectedResource = resources.find((item) => item.id === selectedResourceId) ?? resources[0]
  const selectedBookings = bookings.filter((booking) => booking.resourceId === selectedResource.id)
  const currentBooking = selectedBookings.find((booking) => booking.status === 'Ongoing') ?? selectedBookings.find((booking) => booking.status === 'Upcoming') ?? selectedBookings[0]

  const timelineSlots = useMemo(() => {
    return weekdayLabels.map((day, index) => {
      const dayBookings = selectedBookings.filter((booking) => dayOffsetIndex(booking.date) === index)
      return { day, dayBookings }
    })
  }, [selectedBookings])

  const handleBook = () => {
    const conflict = bookings.find((booking) => booking.resourceId === resourceId && overlaps(booking, date, start, end))
    if (conflict) {
      setNotice(`Time Conflict Detected: ${formatDate(date)} ${start}-${end} overlaps with ${conflict.person}'s booking.`)
      return
    }
    const newBooking: Booking = {
      id: crypto.randomUUID(),
      resourceId,
      person: person.trim() || 'New Booker',
      department: department.trim() || 'General',
      purpose: purpose.trim() || 'Resource booking',
      date,
      start,
      end,
      status: 'Upcoming',
    }
    setBookings((current) => [...current, newBooking].sort((left, right) => `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`)))
    setSelectedResourceId(resourceId)
    setNotice(`Booking created for ${newBooking.person}.`)
    setPerson('')
    setDepartment('')
    setPurpose('')
    setCreateOpen(false)
  }

  const handleCancel = (bookingId: string) => {
    setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, status: 'Cancelled' } : booking))
    setNotice('Booking cancelled. The slot is now available for another request.')
  }

  const handleReschedule = (bookingId: string) => {
    const source = bookings.find((booking) => booking.id === bookingId)
    if (!source) return
    const movedDate = '2026-07-15'
    const movedStart = '10:00'
    const movedEnd = '11:30'
    const conflict = bookings.find((booking) => booking.id !== bookingId && booking.resourceId === source.resourceId && overlaps(booking, movedDate, movedStart, movedEnd))
    if (conflict) {
      setNotice('Reschedule blocked because the new time overlaps with another booking.')
      return
    }
    setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, date: movedDate, start: movedStart, end: movedEnd, status: 'Upcoming' } : booking))
    setNotice('Booking rescheduled and reminder updated.')
  }

  return (
    <section className="resource-booking-page">
      <header className="resource-booking-header">
        <div>
          <h1>RESOURCE BOOKING</h1>
          <p>Book shared rooms, vehicles, and equipment with reminder support and conflict checks.</p>
        </div>
        <button type="button" className="booking-primary" onClick={() => setCreateOpen(true)}>+ New Booking</button>
      </header>

      {notice && <div className="booking-banner"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <div className="booking-layout">
        <aside className="booking-sidebar">
          <div className="section-title">
            <strong>Bookable Resources</strong>
            <span>{resources.length} assets</span>
          </div>
          <div className="resource-list">
            {resources.map((resource) => (
              <button key={resource.id} type="button" className={`resource-card ${resource.id === selectedResource.id ? 'active' : ''}`} onClick={() => setSelectedResourceId(resource.id)}>
                <small>{resource.code}</small>
                <strong>{resource.name}</strong>
                <span>{resource.area} · {resource.category}</span>
                <em className={statusMarker(resource.status).toLowerCase()}>{resource.status}</em>
              </button>
            ))}
          </div>

        </aside>

        <main className="booking-main">
          <section className="booking-calendar-card">
            <div className="section-title">
              <strong>Week view - {selectedResource.name}</strong>
              <span>Bookings shown by day and time</span>
            </div>
            <div className="booking-grid">
              <div className="booking-hours">
                <span />
                {hourLabels.map((hour) => <small key={hour}>{hour}</small>)}
              </div>
              {timelineSlots.map((slot) => (
                <div className="booking-day-column" key={slot.day}>
                  <header>{slot.day}</header>
                  <div className="booking-slot-layer">
                    {hourLabels.map((hour) => <i key={`${slot.day}-${hour}`} className="booking-slot-line" />)}
                    {slot.dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={`booking-chip tone-${bookingStatusTone(booking.status)}`}
                        style={{ top: `${bookingTopOffset(booking.start) + 4}px`, height: `${bookingBlockHeight(booking.start, booking.end)}px` }}
                      >
                        <strong>{booking.person}</strong>
                        <span>{booking.start} - {booking.end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="booking-summary-card">
            <div className="section-title">
              <strong>Bookings for this resource</strong>
              <span>{selectedBookings.length} total records</span>
            </div>
            <div className="booking-summary-list">
              {selectedBookings.map((booking) => (
                <article key={booking.id} className="booking-summary-row">
                  <div>
                    <strong>{booking.person}</strong>
                    <span>{booking.department} · {booking.purpose}</span>
                  </div>
                  <div className="booking-meta">
                    <small>{formatDate(booking.date)}</small>
                    <small>{booking.start} - {booking.end}</small>
                  </div>
                  <div className="booking-row-actions">
                    <span className={`status-pill tone-${bookingStatusTone(booking.status).toLowerCase()}`}>{booking.status}</span>
                    <button type="button" onClick={() => handleReschedule(booking.id)}>Reschedule</button>
                    <button type="button" onClick={() => handleCancel(booking.id)} disabled={booking.status === 'Cancelled'}>Cancel</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="booking-details-card">
            <div className="detail-pill">
              <strong>Selected resource</strong>
              <span>{selectedResource.code} · {selectedResource.status}</span>
            </div>
            <div className="detail-pill">
              <strong>Next booking</strong>
              <span>{currentBooking ? `${currentBooking.person} · ${currentBooking.start} - ${currentBooking.end}` : 'No active booking'}</span>
            </div>
            <div className="detail-pill">
              <strong>Reminder rule</strong>
              <span>Users receive a notification before the slot starts.</span>
            </div>
            <div className="detail-pill">
              <strong>Overlap policy</strong>
              <span>Bookings may touch at the boundary, but any shared time is rejected.</span>
            </div>
          </section>
        </main>
      </div>

      {isCreateOpen && (
        <div className="booking-modal-backdrop" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="booking-modal-header">
              <div>
                <p className="eyebrow">RESOURCE BOOKING</p>
                <h2 id="booking-modal-title">Create booking</h2>
              </div>
              <button type="button" className="booking-modal-close" onClick={() => setCreateOpen(false)} aria-label="Close dialog">×</button>
            </div>
            <div className="booking-form-card booking-modal-body">
              <label>
                Resource
                <select value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
                  {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.code} · {resource.name}</option>)}
                </select>
              </label>
              <label>
                Date
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <div className="form-grid">
                <label>
                  Start Time
                  <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
                </label>
                <label>
                  End Time
                  <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Booker
                  <input value={person} onChange={(event) => setPerson(event.target.value)} placeholder="Priya Sharma" />
                </label>
                <label>
                  Department
                  <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Human Resources" />
                </label>
              </div>
              <label>
                Purpose
                <input value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Quarterly review" />
              </label>
              <div className="booking-modal-actions">
                <button type="button" className="booking-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="button" className="booking-submit" onClick={handleBook}>Book slot</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}