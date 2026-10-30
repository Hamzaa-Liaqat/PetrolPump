import { fetchAlerts } from '@/api/alerts';
import { useFetch } from './useFetch';

// enabled=false (jaise cashier ke liye) to server se kuch nahi mangta.
export function UseAlerts(enabled = true, intervalMs = 60000) {
  const { data, error, loading, reload } = useFetch(
    () => (enabled ? fetchAlerts() : Promise.resolve({ data: { count: 0, alerts: [] } })),
    [enabled],
    enabled ? intervalMs : 0,
  );
  return { alerts: data?.alerts ?? [], count: data?.count ?? 0, loading, error, reload };
}