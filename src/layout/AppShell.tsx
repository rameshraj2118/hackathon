import { useState } from 'react'
import type { TabId } from './navigation'
import { Sidebar } from './Sidebar'
import { Dashboard } from '../features/Dashboard'
import { ResourceBooking } from '../features/ResourceBooking'
import { TabPlaceholder } from '../features/TabPlaceholder'
import { OrganizationSetup } from '../features/OrganizationSetup'
export function AppShell({ onSignOut }: { onSignOut: () => void }) { const [activeTab, setActiveTab] = useState<TabId>('organization-setup'); return <div className="app-shell"><Sidebar activeTab={activeTab} onSelect={setActiveTab} onSignOut={onSignOut}/><main className="app-content">{activeTab === 'dashboard' ? <Dashboard /> : activeTab === 'resource-booking' ? <ResourceBooking /> : activeTab === 'organization-setup' ? <OrganizationSetup /> : <TabPlaceholder tab={activeTab} />}</main></div> }
