'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Bell, Send, Users, User, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

interface Employee {
  id: string
  first_name: string
  last_name: string
  user_id: string | null
}

interface SentNotification {
  id: string
  title: string
  body: string
  type: string
  created_at: string
}

export default function NotificationsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [recentNotifs, setRecentNotifs] = useState<SentNotification[]>([])
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    target: 'all',
    employee_id: '',
    title: '',
    body: '',
    type: 'info',
    action_url: '',
  })
  const supabase = createClient()

  const load = useCallback(async () => {
    const [{ data: emps }, { data: notifs }] = await Promise.all([
      supabase.from('employees').select('id, first_name, last_name, user_id').eq('is_active', true).order('last_name'),
      supabase.from('notifications').select('id, title, body, type, created_at').order('created_at', { ascending: false }).limit(20),
    ])
    setEmployees(emps ?? [])
    setRecentNotifs(notifs ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const send = async () => {
    if (!form.title || !form.body) { toast.error('Titre et message requis'); return }

    if (form.target === 'one' && !form.employee_id) {
      toast.error('Choisissez un employé')
      return
    }

    setSending(true)

    let userIds: string[] = []

    if (form.target === 'all') {
      userIds = employees.filter(e => e.user_id).map(e => e.user_id!)
    } else {
      const emp = employees.find(e => e.id === form.employee_id)
      if (emp?.user_id) userIds = [emp.user_id]
    }

    if (userIds.length === 0) {
      toast.error("Aucun compte utilisateur trouvé pour la cible sélectionnée")
      setSending(false)
      return
    }

    const rows = userIds.map(user_id => ({
      user_id,
      title: form.title,
      body: form.body,
      type: form.type,
      action_url: form.action_url || null,
    }))

    const { error } = await supabase.from('notifications').insert(rows)

    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success(`Notification envoyée à ${userIds.length} personne${userIds.length > 1 ? 's' : ''}`)
      setForm(f => ({ ...f, title: '', body: '', action_url: '' }))
      load()
    }
    setSending(false)
  }

  const typeIcon = (type: string) => {
    if (type === 'success') return '✅'
    if (type === 'warning') return '⚠️'
    if (type === 'error') return '🚫'
    return 'ℹ️'
  }

  return (
    <>
      <AdminHeader title="Notifications" subtitle="Envoyer des messages aux employés" />
      <div className="hm-content">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Compose */}
          <div className="lg:col-span-2">
            <div className="hm-card">
              <div className="flex items-center gap-2 mb-5">
                <Send className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Nouvelle notification</h3>
              </div>

              <div className="space-y-4">
                {/* Target */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                    Destinataires
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setForm(f => ({ ...f, target: 'all' }))}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: form.target === 'all' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-bg-elevated))',
                        color: form.target === 'all' ? 'white' : 'rgb(var(--color-text-muted))',
                      }}>
                      <Users className="w-4 h-4" /> Tous
                    </button>
                    <button
                      onClick={() => setForm(f => ({ ...f, target: 'one' }))}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: form.target === 'one' ? 'rgb(var(--color-primary))' : 'rgb(var(--color-bg-elevated))',
                        color: form.target === 'one' ? 'white' : 'rgb(var(--color-text-muted))',
                      }}>
                      <User className="w-4 h-4" /> Un employé
                    </button>
                  </div>

                  {form.target === 'one' && (
                    <Select
                      label="Employé"
                      value={form.employee_id}
                      onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
                      options={[
                        { value: '', label: '— Choisir —' },
                        ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}${!e.user_id ? ' (pas de compte)' : ''}` })),
                      ]}
                    />
                  )}
                </div>

                <Select
                  label="Type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  options={[
                    { value: 'info', label: 'ℹ️ Information' },
                    { value: 'success', label: '✅ Succès' },
                    { value: 'warning', label: '⚠️ Avertissement' },
                    { value: 'error', label: '🚫 Urgent' },
                  ]}
                />

                <Input
                  label="Titre *"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Rappel réunion d'équipe"
                />

                <Textarea
                  label="Message *"
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Votre message ici..."
                  rows={4}
                />

                <Input
                  label="Lien (optionnel)"
                  value={form.action_url}
                  onChange={e => setForm(f => ({ ...f, action_url: e.target.value }))}
                  placeholder="/employee/punch"
                />

                {/* Preview */}
                {(form.title || form.body) && (
                  <div className="p-3 rounded-lg border" style={{ background: 'rgb(var(--color-bg-secondary))', borderColor: 'rgb(var(--color-border))' }}>
                    <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>Aperçu</p>
                    <div className="flex items-start gap-2">
                      <Bell className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{form.title || '...'}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{form.body || '...'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={send} loading={sending} className="w-full justify-center">
                  <Send className="w-4 h-4" />
                  Envoyer la notification
                </Button>
              </div>
            </div>
          </div>

          {/* Recent notifications log */}
          <div className="lg:col-span-3">
            <div className="hm-card">
              <div className="flex items-center gap-2 mb-5">
                <Bell className="w-5 h-5" style={{ color: 'rgb(var(--color-primary))' }} />
                <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  Historique des 20 dernières
                </h3>
              </div>

              {recentNotifs.length === 0 ? (
                <p className="text-sm text-center py-12" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Aucune notification envoyée.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentNotifs.map(n => (
                    <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                      <span className="text-lg shrink-0">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>{n.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>{n.body}</p>
                      </div>
                      <p className="text-xs shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        {formatDate(n.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employee coverage */}
            <div className="hm-card mt-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4" style={{ color: 'rgb(var(--color-success))' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                  Employés avec compte ({employees.filter(e => e.user_id).length}/{employees.length})
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {employees.map(e => (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: e.user_id ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))' }} />
                    <span style={{ color: 'rgb(var(--color-text-secondary))' }}>
                      {e.first_name} {e.last_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
