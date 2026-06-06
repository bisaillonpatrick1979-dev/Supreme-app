'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTimeAgo } from '@/lib/utils/format'
import type { Notification } from '@/types/database'

const typeIcon: Record<string, string> = {
  success: '✅',
  warning: '⚠️',
  danger: '🚨',
  info: 'ℹ️',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const unread = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    loadNotifications()

    // Click outside to close
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(n => [payload.new as Notification, ...n])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif))
  }

  const markAllRead = async () => {
    const ids = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!ids.length) return
    await supabase.from('notifications').update({ is_read: true }).in('id', ids)
    setNotifications(n => n.map(notif => ({ ...notif, is_read: true })))
  }

  const dismiss = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(n => n.filter(notif => notif.id !== id))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all"
        style={{ background: open ? 'rgb(var(--color-bg-elevated))' : 'transparent', color: 'rgb(var(--color-text-secondary))' }}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white text-xs font-bold px-1"
            style={{ background: 'rgb(var(--color-danger))', fontSize: '10px' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50 animate-fade-in"
          style={{
            background: 'rgb(var(--color-bg-elevated))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'rgb(var(--color-border))' }}>
            <span className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
              Notifications {unread > 0 && <span className="text-xs ml-1" style={{ color: 'rgb(var(--color-primary))' }}>({unread} nouvelles)</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs flex items-center gap-1"
                style={{ color: 'rgb(var(--color-primary))' }}>
                <CheckCheck className="w-3 h-3" /> Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'rgb(var(--color-text-muted))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Aucune notification</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 border-b hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    borderColor: 'rgb(var(--color-border-subtle))',
                    background: !n.is_read ? 'rgb(var(--color-primary-muted))' : 'transparent',
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <span className="text-base shrink-0 mt-0.5">{typeIcon[n.type] ?? 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{n.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-secondary))' }}>{n.body}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>{formatTimeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <button onClick={e => { e.stopPropagation(); markRead(n.id) }}
                        className="p-1 rounded hover:opacity-80" title="Marquer lu">
                        <Check className="w-3 h-3" style={{ color: 'rgb(var(--color-primary))' }} />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                      className="p-1 rounded hover:opacity-80" title="Supprimer">
                      <X className="w-3 h-3" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
