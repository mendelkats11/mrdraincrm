"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/notifications/notification-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

function linkFor(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "reminder":
      return "/reminders";
    case "lead":
      return `/leads/${entityId}`;
    case "call":
      return `/calls/${entityId}`;
    case "message":
      // No message detail page exists (list-only) — see src/app/app/(dashboard)/messages/page.tsx.
      return "/messages";
    default:
      return null;
  }
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationRow[];
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                  router.refresh();
                })
              }
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="flex max-h-96 flex-col overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((n) => {
              const href = linkFor(n.entityType, n.entityId);
              const content = (
                <div
                  className={`flex flex-col gap-0.5 border-b p-3 text-sm ${n.readAt ? "" : "bg-muted/50"}`}
                >
                  <span className="font-medium">{n.title}</span>
                  {n.body ? <span className="text-muted-foreground">{n.body}</span> : null}
                  <span className="text-xs text-muted-foreground">
                    {DATE_FMT.format(n.createdAt)}
                  </span>
                </div>
              );

              return (
                <button
                  key={n.id}
                  type="button"
                  className="text-left hover:bg-muted/70"
                  onClick={() =>
                    startTransition(async () => {
                      if (!n.readAt) await markNotificationReadAction(n.id);
                      router.refresh();
                      if (href) router.push(href);
                    })
                  }
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
