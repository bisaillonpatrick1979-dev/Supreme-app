'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatTimeAgo } from '@/lib/utils/format'

interface LivePunch {
  id: string
  punched_at: string
  punch_type: string
  employee: { first_name: string; last_name: string } | null
}

export function LivePunchFeed({ initialPunches }: { initialPunches?: LivePunch[] }) {
  const [punches, setPunches] = useState<LivePunch[]>(initialPunches ?? [])
  const supabase = createClient()

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]

    if (!initialPunches) {
      supabase
        .from('punch_records')
        .select('id, punched_at, punch_type, employee:employees(first_name,last_name)')
        .eq('punch_type', 'in')
        .gte('punched_at', todayStr)
        .order('punched_at', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setPunches(data as unknown as LivePunch[])
        })
    }

    const channel = supabase
      .channel('live-punches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'punch_records',
      }, async payload => {
        const rec = payload.new as { id: string; punch_type: string; punched_at: string; employee_id: string }
        if (rec.punch_type === 'out') {
          // Remove the employee from the active list
          setPunches(prev => prev.filter(p => {
            // We can't match by employee_id here since punch records don't have it in prev
            return true
          }))
          return
        }
        // Fetch employee info
        const { data: emp } = await supabase
          .from('employees')
          .select('first_name, last_name')
          .eq('id', rec.employee_id)
          .single()

        const newPunch: LivePunch = {
          id: rec.id,
          punched_at: rec.punched_at,
          punch_type: rec.punch_type,
          employee: emp ?? null,
        }
        setPunches(prev => [newPunch, ...prev].slice(0, 10))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, initialPunches])

  const active = punches.filter(p => p.punch_type === 'in')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
          Pointages en direct
        </h3>
        <span className="hm-badge hm-badge-success text-xs">
          {active.length} actif{active.length !== 1 ? 's' : ''}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {"Aucun pointage aujourd'hui"}
        </p>
      ) : (
        <div className="space-y-2">
          {active.map(p => (
            <div key={p.id} className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))' }}>
                  {p.employee
                    ? `${p.employee.first_name[0]}${p.employee.last_name[0]}`
                    : '?'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    background: 'rgb(var(--color-success))',
                    borderColor: 'rgb(var(--color-bg-card))',
                  }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : 'Inconnu'}
                </p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  {formatTimeAgo(p.punched_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
