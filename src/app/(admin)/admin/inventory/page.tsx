'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { AlertTriangle, Plus, Package, ArrowUp, ArrowDown, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

interface InventoryItem {
  id: string
  name: string
  sku: string | null
  category: string | null
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  unit: string
  reorder_point: number | null
  storage_location: string | null
  notes: string | null
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('reception')
  const [adjusting, setAdjusting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')
  const [form, setForm] = useState({
    name: '', sku: '', category: 'roofing', unit: 'unité',
    quantity_on_hand: '0', reorder_point: '', storage_location: '', notes: '',
  })
  const supabase = createClient()

  const loadItems = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('inventory_items').select('*').order('name')
    if (filterCategory) q = q.eq('category', filterCategory)
    const { data } = await q
    setItems(data ?? [])
    setLoading(false)
  }, [supabase, filterCategory])

  useEffect(() => { loadItems() }, [loadItems])

  const handleAdjust = async () => {
    if (!adjustItem) return
    const delta = parseInt(adjustDelta)
    if (isNaN(delta) || delta === 0) { toast.error('Entrez une quantité valide (ex: 10 ou -5)'); return }
    setAdjusting(true)
    const newQty = Math.max(0, adjustItem.quantity_on_hand + delta)
    const newAvail = Math.max(0, newQty - adjustItem.quantity_reserved)
    const { error } = await supabase.from('inventory_items').update({
      quantity_on_hand: newQty,
      quantity_available: newAvail,
    }).eq('id', adjustItem.id)
    if (error) {
      toast.error('Erreur ajustement: ' + error.message)
    } else {
      toast.success(`Stock de ${adjustItem.name} mis à jour → ${newQty} ${adjustItem.unit}`)
      setAdjustItem(null)
      setAdjustDelta('')
      loadItems()
    }
    setAdjusting(false)
  }

  const handleAddItem = async () => {
    if (!form.name || !form.unit) { toast.error('Nom et unité requis'); return }
    setSaving(true)
    const qty = parseInt(form.quantity_on_hand) || 0
    const { error } = await supabase.from('inventory_items').insert([{
      name: form.name,
      sku: form.sku || null,
      category: form.category || null,
      unit: form.unit,
      quantity_on_hand: qty,
      quantity_reserved: 0,
      quantity_available: qty,
      reorder_point: form.reorder_point ? parseInt(form.reorder_point) : null,
      storage_location: form.storage_location || null,
      notes: form.notes || null,
    }])
    if (error) {
      toast.error('Erreur: ' + error.message)
    } else {
      toast.success('Article ajouté!')
      setShowAddModal(false)
      setForm({ name: '', sku: '', category: 'roofing', unit: 'unité', quantity_on_hand: '0', reorder_point: '', storage_location: '', notes: '' })
      loadItems()
    }
    setSaving(false)
  }

  const lowStock = items.filter(i => i.reorder_point != null && i.quantity_available <= i.reorder_point)
  const categories = ['roofing', 'siding', 'insulation', 'trim', 'fasteners', 'other']

  return (
    <>
      <AdminHeader title="Inventaire" subtitle="Gestion des stocks de matériaux" />
      <div className="hm-content">

        {/* Alert banner */}
        {lowStock.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ background: 'rgb(var(--color-warning) / 0.1)', border: '1px solid rgb(var(--color-warning) / 0.3)' }}>
            <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
              <strong>{lowStock.length}</strong> article{lowStock.length > 1 ? 's' : ''} sous le seuil:&nbsp;
              {lowStock.map(i => i.name).join(', ')}
            </p>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="hm-card flex items-center gap-3">
            <Package className="w-8 h-8" style={{ color: 'rgb(var(--color-primary))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Total articles</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </div>
          </div>
          <div className="hm-card flex items-center gap-3">
            <AlertTriangle className="w-8 h-8" style={{ color: 'rgb(var(--color-warning))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-warning))' }}>À réapprovisionner</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-warning))' }}>{lowStock.length}</p>
            </div>
          </div>
          <div className="hm-card flex items-center gap-3">
            <Package className="w-8 h-8" style={{ color: 'rgb(var(--color-success))' }} />
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>En stock OK</p>
              <p className="text-2xl font-bold" style={{ color: 'rgb(var(--color-success))' }}>{items.length - lowStock.length}</p>
            </div>
          </div>
        </div>

        {/* Filters + actions */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterCategory('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: !filterCategory ? 'rgb(var(--color-primary))' : 'rgb(var(--color-bg-elevated))',
                color: !filterCategory ? 'white' : 'rgb(var(--color-text-muted))',
              }}>Tout</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background: filterCategory === cat ? 'rgb(var(--color-primary))' : 'rgb(var(--color-bg-elevated))',
                  color: filterCategory === cat ? 'white' : 'rgb(var(--color-text-muted))',
                }}>{cat}</button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Nouvel article
          </Button>
        </div>

        {/* Table */}
        <div className="hm-card">
          <div className="overflow-x-auto">
            <table className="hm-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Catégorie</th>
                  <th>En stock</th>
                  <th>Réservé</th>
                  <th>Disponible</th>
                  <th>Unité</th>
                  <th>Seuil</th>
                  <th>Emplacement</th>
                  <th>Statut</th>
                  <th>Ajuster</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8">
                    <div className="hm-skeleton h-4 w-48 mx-auto" />
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-sm"
                    style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Aucun article. Ajoutez votre premier stock.
                  </td></tr>
                ) : items.map(item => {
                  const isLow = item.reorder_point != null && item.quantity_available <= item.reorder_point
                  return (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.sku && <p className="text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.sku}</p>}
                      </td>
                      <td><span className="text-sm capitalize">{item.category ?? '—'}</span></td>
                      <td className="font-semibold">{item.quantity_on_hand}</td>
                      <td style={{ color: 'rgb(var(--color-warning))' }}>
                        {item.quantity_reserved > 0 ? item.quantity_reserved : '—'}
                      </td>
                      <td className="font-bold" style={{ color: isLow ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))' }}>
                        {item.quantity_available}
                      </td>
                      <td className="text-sm">{item.unit}</td>
                      <td className="text-sm">{item.reorder_point ?? '—'}</td>
                      <td className="text-sm">{item.storage_location ?? '—'}</td>
                      <td><Badge variant={isLow ? 'danger' : 'success'}>{isLow ? 'Bas' : 'OK'}</Badge></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setAdjustItem(item); setAdjustDelta('') }}
                            className="p-1.5 rounded-lg transition-all"
                            title="Ajuster le stock"
                            style={{ background: 'rgb(var(--color-primary-muted))', color: 'rgb(var(--color-primary))' }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Adjust modal */}
      <Modal
        isOpen={!!adjustItem}
        onClose={() => { setAdjustItem(null); setAdjustDelta('') }}
        title={`Ajuster le stock — ${adjustItem?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAdjustItem(null); setAdjustDelta('') }}>Annuler</Button>
            <Button onClick={handleAdjust} loading={adjusting}>Confirmer</Button>
          </>
        }
      >
        {adjustItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg" style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Actuel</p>
                <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{adjustItem.quantity_on_hand}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{adjustItem.unit}</p>
              </div>
              <div className="flex items-center justify-center">
                {adjustDelta && !isNaN(parseInt(adjustDelta)) && parseInt(adjustDelta) !== 0 ? (
                  parseInt(adjustDelta) > 0
                    ? <ArrowUp className="w-6 h-6" style={{ color: 'rgb(var(--color-success))' }} />
                    : <ArrowDown className="w-6 h-6" style={{ color: 'rgb(var(--color-danger))' }} />
                ) : <span style={{ color: 'rgb(var(--color-text-muted))' }}>→</span>}
              </div>
              <div className="p-3 rounded-lg" style={{
                background: 'rgb(var(--color-bg-secondary))',
                border: adjustDelta ? '1px solid rgb(var(--color-primary))' : 'none',
              }}>
                <p className="text-xs mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Nouveau</p>
                <p className="text-xl font-bold" style={{ color: 'rgb(var(--color-primary))' }}>
                  {adjustDelta && !isNaN(parseInt(adjustDelta))
                    ? Math.max(0, adjustItem.quantity_on_hand + parseInt(adjustDelta))
                    : adjustItem.quantity_on_hand}
                </p>
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{adjustItem.unit}</p>
              </div>
            </div>

            <Input
              label="Ajustement (+ réception, - sortie)"
              type="number"
              value={adjustDelta}
              onChange={e => setAdjustDelta(e.target.value)}
              placeholder="ex: +10 ou -3"
            />

            <Select
              label="Raison"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              options={[
                { value: 'reception', label: 'Réception de marchandise' },
                { value: 'utilisation', label: 'Utilisation chantier' },
                { value: 'retour', label: 'Retour fournisseur' },
                { value: 'inventaire', label: 'Correction inventaire' },
                { value: 'perte', label: 'Perte / bris' },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Add item modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nouvel article inventaire"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
            <Button onClick={handleAddItem} loading={saving}>Ajouter</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Input label="SKU / Code" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <Select label="Catégorie" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={categories.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          <Input label="Unité *" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="unité, pqt, pi², etc." />
          <Input label="Quantité initiale" type="number" value={form.quantity_on_hand} onChange={e => setForm(f => ({ ...f, quantity_on_hand: e.target.value }))} />
          <Input label="Seuil réappro." type="number" value={form.reorder_point} onChange={e => setForm(f => ({ ...f, reorder_point: e.target.value }))} />
          <Input label="Emplacement" value={form.storage_location} onChange={e => setForm(f => ({ ...f, storage_location: e.target.value }))} placeholder="Étagère A, Camion 1, etc." className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
