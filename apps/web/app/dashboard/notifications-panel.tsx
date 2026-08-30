import type { NotificationRow } from "@/lib/complaints/citizen-dashboard";

export function NotificationsPanel({ notifications }: { notifications: NotificationRow[] }) {
  if (notifications.length === 0) {
    return <p className="text-sm text-muted-foreground">No notifications yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {notifications.map((n) => (
        <li key={n.id} className="text-sm">
          <p>{n.message}</p>
          <p className="text-xs text-muted-foreground">{n.createdAt.toLocaleString()}</p>
        </li>
      ))}
    </ul>
  );
}
