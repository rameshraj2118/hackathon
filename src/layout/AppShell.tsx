import { useState } from 'react'
import type { TabId } from './navigation'
import { Sidebar } from './Sidebar'
import { Dashboard } from '../features/Dashboard'
import { QrManagement } from '../features/QrManagement'
import { AssetDirectory } from '../features/AssetDirectory'
import { ResourceBooking } from '../features/ResourceBooking'
import { AllocationTransfer } from '../features/AllocationTransfer'
import { MaintenanceManagement } from '../features/MaintenanceManagement'
import { AuditCycles } from '../features/AuditCycles'
import { ReportsAnalytics } from '../features/ReportsAnalytics'
import { Notifications } from '../features/Notifications'
import { TabPlaceholder } from '../features/TabPlaceholder'
import { OrganizationSetup } from '../features/OrganizationSetup'

export function AppShell({ onSignOut }: { onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const content = activeTab === 'dashboard' ? <Dashboard onNavigate={setActiveTab} /> : activeTab === 'qr-management' ? <QrManagement /> : activeTab === 'asset-directory' ? <AssetDirectory /> : activeTab === 'resource-booking' ? <ResourceBooking /> : activeTab === 'allocation-transfer' ? <AllocationTransfer /> : activeTab === 'maintenance' ? <MaintenanceManagement /> : activeTab === 'audit-cycles' ? <AuditCycles /> : activeTab === 'reports-analytics' ? <ReportsAnalytics /> : activeTab === 'notifications' ? <Notifications /> : activeTab === 'organization-setup' ? <OrganizationSetup /> : <TabPlaceholder tab={activeTab} />
  return <div className="app-shell"><Sidebar activeTab={activeTab} onSelect={setActiveTab} onSignOut={onSignOut}/><main className="app-content">{content}</main></div>
}
