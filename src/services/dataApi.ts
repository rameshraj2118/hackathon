import { request } from './http'

export const dataApi = {
  list: <T>(table: string, token: string) => request<{ [key: string]: T[] }>(`/api/${table}`, { headers: { Authorization: `Bearer ${token}` } }),
  save: <T>(table: string, value: T, token: string) => request<{ item: T }>(`/api/${table}`, { method: 'POST', body: JSON.stringify(value), headers: { Authorization: `Bearer ${token}` } }),
  remove: (table: string, id: string, token: string) => request<void>(`/api/${table}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
}
