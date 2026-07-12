import { useState } from 'react'
import type { TabId } from './navigation'
import { Sidebar } from './Sidebar'
import { Dashboard } from '../features/Dashboard'
import { QrManagement } from '../features/QrManagement'
import { ResourceBooking } from '../features/ResourceBooking'
<<<<<<< HEAD
import { AllocationTransfer } from '../features/AllocationTransfer'
import { MaintenanceManagement } from '../features/MaintenanceManagement'
import { TabPlaceholder } from '../features/TabPlaceholder'
import { OrganizationSetup } from '../features/OrganizationSetup'
export function AppShell({ onSignOut }: { onSignOut: () => void }) { const [activeTab, setActiveTab] = useState<TabId>('organization-setup'); return <div className="app-shell"><Sidebar activeTab={activeTab} onSelect={setActiveTab} onSignOut={onSignOut}/><main className="app-content">{activeTab === 'dashboard' ? <Dashboard /> : activeTab === 'resource-booking' ? <ResourceBooking /> : activeTab === 'allocation-transfer' ? <AllocationTransfer /> : activeTab === 'maintenance' ? <MaintenanceManagement /> : activeTab === 'organization-setup' ? <OrganizationSetup /> : <TabPlaceholder tab={activeTab} />}</main></div> }
=======
import { OrganizationSetup } from '../features/OrganizationSetup'
import { TabPlaceholder } from '../features/TabPlaceholder'

export function AppShell({ onSignOut }: { onSignOut: () => void }) { const [activeTab, setActiveTab] = useState<TabId>('dashboard'); return <div className="app-shell"><Sidebar activeTab={activeTab} onSelect={setActiveTab} onSignOut={onSignOut}/><main className="app-content">{activeTab === 'dashboard' ? <Dashboard /> : activeTab === 'qr-management' ? <QrManagement /> : activeTab === 'resource-booking' ? <ResourceBooking /> : activeTab === 'organization-setup' ? <OrganizationSetup /> : <TabPlaceholder tab={activeTab} />}</main></div> }
>>>>>>> 36c44edbf19fc65791459af5c0fc1bf0b8fc6c0b
