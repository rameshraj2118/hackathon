import { useState } from 'react'
import type { TabId } from './navigation'
import { Sidebar } from './Sidebar'
import { Dashboard } from '../features/Dashboard'
import { QrManagement } from '../features/QrManagement'
import { ResourceBooking } from '../features/ResourceBooking'
import { AllocationTransfer } from '../features/AllocationTransfer'
import { MaintenanceManagement } from '../features/MaintenanceManagement'
import { OrganizationSetup } from '../features/OrganizationSetup'
import { TabPlaceholder } from '../features/TabPlaceholder'

export function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const content = activeTab === 'dashboard' ? <Dashboard /> : activeTab === 'qr-management' ? <QrManagement /> : activeTab === 'resource-booking' ? <ResourceBooking /> : activeTab === 'allocation-transfer' ? <AllocationTransfer /> : activeTab === 'maintenance' ? <MaintenanceManagement /> : activeTab === 'organization-setup' ? <OrganizationSetup /> : <TabPlaceholder tab={activeTab} />
  return <div className="app-shell"><Sidebar activeTab={activeTab} onSelect={setActiveTab} onSignOut={onSignOut}/><main className="app-content">{content}</main></div>
}
