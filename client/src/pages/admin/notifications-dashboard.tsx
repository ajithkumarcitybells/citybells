import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';

function fetchJSON(url: string) {
  return fetch(url).then(r => { if (!r.ok) throw new Error('Fetch failed'); return r.json(); });
}

export default function NotificationsDashboard() {
  const [view, setView] = useState<'products'|'orders'|'notifications'>('products');
  const { data: products = [] } = useQuery({ queryKey: ['/api/admin/products'], queryFn: () => fetchJSON('/api/admin/products') });
  const { data: orders = [] } = useQuery({ queryKey: ['/api/admin/orders'], queryFn: () => fetchJSON('/api/admin/orders') });
  const { data: notifications = [] } = useQuery({ queryKey: ['/api/admin/notifications'], queryFn: () => fetchJSON('/api/admin/notifications') });

  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const counts: Record<string, number> = {};
      for (const p of products.slice(0, 50)) {
        try {
          const res = await fetch(`/api/admin/restock/subscribers/${p.id}`);
          if (!res.ok) continue;
          const list = await res.json();
          counts[p.id] = list.length;
        } catch (e:any) { console.error(e); }
      }
      setSubscriberCounts(counts);
    })();
  }, [products]);

  const sendProductNotify = useMutation({
    mutationFn: async ({ productId, title, description }: any) => {
      const res = await fetch('/api/admin/restock/bulk-notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: [productId], title, description }) });
      if (!res.ok) throw new Error('send failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] }); }
  });

  const sendUserNotify = useMutation({
    mutationFn: async ({ userId, type, relatedId, title, description, meta }: any) => {
      const res = await fetch('/api/admin/notifications/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type, relatedId, title, description, meta }) });
      if (!res.ok) throw new Error('send failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] }); }
  });

  const retryNotification = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/notifications/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('retry failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] }); }
  });

  const sendAdminTest = useMutation({
    mutationFn: async ({ userId, title, description }: any) => {
      const res = await fetch('/api/admin/notifications/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, title, description }) });
      if (!res.ok) throw new Error('send test failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] }); }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin Notifications Dashboard</h1>
      <div className="mb-4 flex gap-2">
          <Button onClick={() => setView('products')} variant={view==='products' ? 'default' : 'outline'}>Products</Button>
          <Button onClick={() => setView('orders')} variant={view==='orders' ? 'default' : 'outline'}>Orders</Button>
          <Button onClick={() => setView('notifications')} variant={view==='notifications' ? 'default' : 'outline'}>Notifications</Button>
      </div>

      {view === 'products' && (
        <div>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">Product</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Subscribers</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.stock}</td>
                  <td className="p-2">{subscriberCounts[p.id] ?? 0}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => sendProductNotify.mutate({ productId: p.id, title: `${p.name} restocked`, description: `${p.name} is back in stock.` })}>Send Restock</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'orders' && (
        <div>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">Order</th>
                <th className="p-2">Customer</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">{o.orderNumber}</td>
                  <td className="p-2">{o.customerName || o.customerEmail}</td>
                  <td className="p-2">{o.status}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => sendUserNotify.mutate({ userId: o.userId, type: 'order.out_for_delivery', relatedId: o.id, title: `Order ${o.orderNumber} is out for delivery`, description: `Order ${o.orderNumber} is on the way.` })}>Out for Delivery</Button>
                      <Button size="sm" onClick={() => sendUserNotify.mutate({ userId: o.userId, type: 'order.cancelled', relatedId: o.id, title: `Order ${o.orderNumber} cancelled`, description: `Your order ${o.orderNumber} has been cancelled.` })}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'notifications' && (
        <div>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">When</th>
                <th className="p-2">User</th>
                <th className="p-2">Title</th>
                <th className="p-2">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n: any) => (
                <tr key={n._id} className="border-t">
                  <td className="p-2">{new Date(n.createdAt).toLocaleString()}</td>
                  <td className="p-2">{n.userId}</td>
                  <td className="p-2">{n.title}</td>
                  <td className="p-2">{n.status || 'unknown'}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => retryNotification.mutate(n._id)}>Retry</Button>
                      <Button size="sm" variant="outline" onClick={() => sendAdminTest.mutate({ userId: n.userId, title: `Admin test: ${n.title}`, description: `Test for notification ${n._id}` })}>Send Test</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
