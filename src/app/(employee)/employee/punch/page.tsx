'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils/format'
import type { PunchRecord, Employee } from '@/types/database'

export default function PunchPage() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [lastPunch, setLastPunch] = useState<PunchRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [address, setAddress] = useState<string>('')
  const [elapsedTime, setElapsedTime] = useState<string>('')
  const supabase = createClient()

  const isClockedIn = lastPunch?.punch_type === 'in' || lastPunch?.punch_type === 'break_end'

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!emp) return
    setEmployee(emp)

    const { data: punch } = await supabase
      .from('punch_records')
      .select('*')
      .eq('employee_id', emp.id)
      .order('punched_at', { ascending: false })
      .limit(1)
      .single()

    setLastPunch(punch)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Elapsed time ticker
  useEffect(() => {
    if (!isClockedIn || !lastPunch) return
    const update = () => {
      const diff = Date.now() - new Date(lastPunch.punched_at).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsedTime(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [isClockedIn, lastPunch])

  const getLocation = useCallback(() => {
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setCoords({ lat, lng, accuracy })

        // Reverse geocode
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          if (data.results[0]) {
            setAddress(data.results[0].formatted_address)
          }
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }

        setLocationLoading(false)
      },
      (err) => {
        toast.error('Impossible d\'obtenir la localisation: ' + err.message)
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => { getLocation() }, [getLocation])

  const handlePunch = async () => {
    if (!employee || !coords) {
      toast.error('Localisation requise pour pointer')
      return
    }

    setLoading(true)
    try {
      const punchType = isClockedIn ? 'out' : 'in'

      const res = await fetch('/api/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          punch_type: punchType,
          lat: coords.lat,
          lng: coords.lng,
          accuracy: coords.accuracy,
          address,
        }),
      })

      if (!res.ok) throw new Error('Erreur lors du pointage')

      toast.success(isClockedIn ? 'Bonne journée! Sortie enregistrée ✓' : 'Bonne journée! Entrée enregistrée ✓')
      await loadData()
    } catch {
      toast.error('Erreur lors du pointage')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="flex items-center px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-bg-card))' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Pointage</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Enregistrez votre entrée et sortie
          </p>
        </div>
      </header>

      <div className="hm-content flex flex-col items-center justify-center min-h-0 flex-1">
        <div className="w-full max-w-md space-y-6">
          {/* Current status */}
          {lastPunch && (
            <div className="hm-card text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {isClockedIn
                  ? <CheckCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-success))' }} />
                  : <AlertCircle className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />}
                <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {isClockedIn ? 'En travail' : 'Hors travail'}
                </p>
              </div>
              {isClockedIn && (
                <p className="text-3xl font-mono font-bold my-3"
                  style={{ color: 'rgb(var(--color-primary))' }}>
                  {elapsedTime}
                </p>
              )}
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                Dernier pointage: {formatDateTime(lastPunch.punched_at)}
              </p>
            </div>
          )}

          {/* Location status */}
          <div className="hm-card">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{
                color: coords ? 'rgb(var(--color-success))' : 'rgb(var(--color-text-muted))'
              }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {locationLoading ? 'Obtention de la localisation...' : coords ? 'Localisation obtenue' : 'Localisation non disponible'}
                </p>
                {address && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    {address}
                  </p>
                )}
                {coords && (
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Précision: ±{Math.round(coords.accuracy)}m
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={getLocation} disabled={locationLoading}>
                Rafraîchir
              </Button>
            </div>
          </div>

          {/* Big punch button */}
          <div className="flex justify-center py-4">
            <button
              onClick={handlePunch}
              disabled={loading || !coords}
              className={`punch-btn ${isClockedIn ? 'punch-btn-out' : ''}`}
              style={{ opacity: (!coords || loading) ? 0.6 : 1 }}
            >
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-lg font-black">
                  {loading ? 'En cours...' : isClockedIn ? 'POINTER SORTIE' : 'POINTER ENTRÉE'}
                </p>
              </div>
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Votre localisation GPS est enregistrée à chaque pointage
          </p>
        </div>
      </div>
    </>
  )
}
