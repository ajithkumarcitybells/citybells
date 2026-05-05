import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  kind: "order" | "offer" | "delivery";
  read: boolean;
}

const STORAGE_KEY = "city-bell-header-notifications";

const fallbackNotifications: AppNotification[] = [
  {
    id: "notif-order-delivered",
    title: "Order Delivered",
    description: "Your grocery order has been delivered at the doorstep.",
    timestamp: "2 min ago",
    kind: "order",
    read: false,
  },
  {
    id: "notif-offer-weekend",
    title: "Fresh Deals Live",
    description: "Get up to 25% off on milk, snacks, and breakfast essentials.",
    timestamp: "15 min ago",
    kind: "offer",
    read: false,
  },
  {
    id: "notif-delivery-live",
    title: "Delivery On The Way",
    description: "Your rider is 8 minutes away with tonight's order.",
    timestamp: "28 min ago",
    kind: "delivery",
    read: true,
  },
  {
    id: "notif-offer-cashback",
    title: "Wallet Cashback",
    description: "Complete 3 orders this week to unlock a cashback bonus.",
    timestamp: "1 hr ago",
    kind: "offer",
    read: true,
  },
];

function readStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") {
    return fallbackNotifications;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallbackNotifications;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallbackNotifications;
    }

    return parsed as AppNotification[];
  } catch {
    return fallbackNotifications;
  }
}

function persistNotifications(notifications: AppNotification[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

function normalizeNotifications(payload: unknown): AppNotification[] {
  if (!Array.isArray(payload)) {
    return readStoredNotifications();
  }

  return payload.map((item, index) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const rawKind = typeof record.kind === "string" ? record.kind : typeof record.type === "string" ? record.type : "order";
    const kind = rawKind === "offer" || rawKind === "delivery" ? rawKind : "order";

    return {
      id: String(record.id ?? `notification-${index + 1}`),
      title: String(record.title ?? "Update"),
      description: String(record.description ?? record.message ?? ""),
      timestamp: String(record.timestamp ?? record.createdAt ?? "Just now"),
      kind,
      read: Boolean(record.read ?? record.isRead ?? false),
    };
  });
}

async function fetchNotifications(): Promise<AppNotification[]> {
  const stored = readStoredNotifications();

  try {
    const response = await fetch("/api/notifications", {
      credentials: "include",
    });

    if (!response.ok) {
      return stored;
    }

    const notifications = normalizeNotifications(await response.json());
    persistNotifications(notifications);
    return notifications;
  } catch {
    return stored;
  }
}

async function markAllAsRead(notifications: AppNotification[]): Promise<AppNotification[]> {
  try {
    await fetch("/api/notifications/read", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markAll: true }),
    });
  } catch {
    // Keep the UI responsive even when the notifications API is not available.
  }

  const updatedNotifications = notifications.map((notification) => ({
    ...notification,
    read: true,
  }));

  persistNotifications(updatedNotifications);
  return updatedNotifications;
}

export function useNotifications() {
  const notificationsQuery = useQuery<AppNotification[]>({
    queryKey: ["header-notifications"],
    queryFn: fetchNotifications,
    initialData: readStoredNotifications,
    staleTime: 60_000,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => markAllAsRead(notificationsQuery.data ?? []),
    onSuccess: (notifications) => {
      queryClient.setQueryData(["header-notifications"], notifications);
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: (notificationsQuery.data ?? []).filter((notification) => !notification.read).length,
    isLoading: notificationsQuery.isLoading,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}