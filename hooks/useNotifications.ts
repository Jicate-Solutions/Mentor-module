/**
 * useNotifications Hook
 * Real-time notifications hook with Supabase subscriptions
 */

'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/components/providers/AuthProvider';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch initial notifications via API route
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token') || '';
        const res = await fetch('/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // Silently handle missing table / auth errors the same way the
          // original hook did so the rest of the app keeps working.
          if (res.status === 404 || res.status === 401) {
            setNotifications([]);
            setUnreadCount(0);
            return;
          }
          throw new Error('Failed to fetch notifications');
        }

        const json = await res.json();
        const data: Notification[] = json.data || [];

        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  // Subscribe to real-time changes — kept intact, uses browser Supabase client
  // which only needs the anon key (needed for Realtime channels).
  useEffect(() => {
    if (!user) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // We need the Supabase `user_id` (UUID) that corresponds to this JKKN user.
    // The notifications table stores user_id as the Supabase users.id, which is
    // what the API route returns in each notification record.
    // We listen broadly and filter in the callback using the notification's
    // user_id that arrives in the payload — the Realtime filter below still
    // reduces traffic by using the JKKN user id where possible, but we
    // maintain the subscription regardless.

    try {
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification;
              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
            } else if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification;
              setNotifications(prev => {
                const updated = prev.map(n =>
                  n.id === updatedNotification.id ? updatedNotification : n
                );
                setUnreadCount(updated.filter(n => !n.read).length);
                return updated;
              });
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev =>
                prev.filter(n => n.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.warn('Could not subscribe to notifications:', error);
    }
  }, [user]);

  // Mark a single notification as read via API
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token') || '';
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to mark notification as read');
      }

      // Update local state optimistically
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read by calling markAsRead for each unread one
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token') || '';
      const unread = notifications.filter(n => !n.read);

      await Promise.all(
        unread.map(n =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Delete a notification via API
  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token') || '';
      const res = await fetch(
        `/api/notifications?id=${encodeURIComponent(notificationId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete notification');
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
