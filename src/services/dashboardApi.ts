import { request } from './http'

export type DashboardData = { company: { name: string; date: string }; metrics: { label: string; value: number; icon: string; tone: string; note?: string }[]; allocation: { label: string; value: number; tone: string }[]; statuses: { label: string; value: number; tone: string }[]; departments: { name: string; assets: number; bookings: number }[]; maintenance: { month: string; requests: number; resolved: number }[]; bookingHeatmap: number[][]; activities: { tone: string; title: string; detail: string; time: string }[] }
export const dashboardApi = { overview: (token: string) => request<{ dashboard: DashboardData }>('/api/dashboard/overview', { headers: { Authorization: `Bearer ${token}` } }) }
