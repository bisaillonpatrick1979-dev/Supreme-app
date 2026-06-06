'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Plus, Package } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import type { CatalogItem, MaterialCategory } from '@/types/database'

const categories: { value: MaterialCategory; label: string }[] = [
  { value: 'siding', label: 'Siding' },
  { value: 'roofing', label: 'Toiture' },
  { value: 'insulation', label: 'Isolation' },
  { value: 'trim', label: 'Garnitures' },
  { value: 'fasteners', label: 'Fixations' },
  { value: 'other', label: 'Autre' },
]

const categoryVariant = (c: string): 'success' | 'info' | 'warning' | 'muted' | 'danger' => {
  const map: Record<string, 'success' | 'info' | 'warning' | 'muted' | 'danger'> = {
    siding: 'info', roofing: 'info', insulation: 'warning', trim: 'muted', fasteners: 'muted', other: 'muted',
  }
  return map[c] ?? 'muted'
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category: 'siding' as MaterialCategory, sku: '', unit: 'sqft',
    price_supplier: '', price_client: '', price_subcontractor: '',
    brand: '', color: '', thickness: '', warranty_years: '', notes: '',
  })
  const supabase = createClient()

  useEffect(() => { loadItems() }, [])

  const loadItems = async () => {
    const { data } = await supabase.from('catalog_items').select('*').order('category').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.name || !form.price_client) { toast.error('Nom et prix client requis'); return }
    setSaving(true)
    const { error } = await supabase.from('catalog_items').insert([{
      ...form,
      price_supplier: form.price_supplier ? parseFloat(form.price_supplier) : null,
      price_client: parseFloat(form.price_client),
      price_subcontractor: form.price_subcontractor ? parseFloat(form.price_subcontractor) : null,
      warranty_years: form.warranty_years ? parseInt(form.warranty_years) : null,
    }])
    if (error) { toast.error(error.message) } else { toast.success('Article ajouté!'); setShowModal(false); loadItems() }
    setSaving(false)
  }

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)

  return (
    <>
      <AdminHeader title="Catalogue" subtitle="Matériaux siding, toiture et plus — avec 3 niveaux de prix" />
      <div className="hm-content">
        {/* Category filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`hm-badge cursor-pointer transition-all ${activeCategory === 'all' ? 'hm-badge-info' : 'hm-badge-muted'}`}
          >
            Tous ({items.length})
          </button>
          {categories.map(c => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`hm-badge cursor-pointer transition-all ${activeCategory === c.value ? 'hm-badge-info' : 'hm-badge-muted'}`}
            >
              {c.label} ({items.filter(i => i.category === c.value).length})
            </button>
          ))}
        </div>

        <div className="hm-page-header">
          <div />
          <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Nouvel article</Button>
        </div>

        {/* Grid of catalog items */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="hm-card"><div className="hm-skeleton h-4 w-3/4 mb-2" /><div className="hm-skeleton h-6 w-1/2" /></div>
          )) : filtered.map(item => (
            <div key={item.id} className="hm-card hover:border-primary transition-all cursor-pointer"
              style={{ borderColor: item.is_active ? 'rgb(var(--color-border))' : 'rgb(var(--color-danger) / 0.3)' }}>
              <div className="flex items-start justify-between mb-2">
                <Badge variant={categoryVariant(item.category)}>
                  {categories.find(c => c.value === item.category)?.label ?? item.category}
                </Badge>
                {!item.is_active && <Badge variant="danger">Inactif</Badge>}
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>{item.name}</p>
              {item.brand && <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.brand}</p>}
              {item.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>{item.description}</p>}
              <div className="space-y-1 border-t pt-3" style={{ borderColor: 'rgb(var(--color-border))' }}>
                {item.price_supplier && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>Fournisseur</span>
                    <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{formatCurrency(item.price_supplier)}/{item.unit}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgb(var(--color-text-muted))' }}>Client</span>
                  <span className="font-semibold" style={{ color: 'rgb(var(--color-success))' }}>{formatCurrency(item.price_client)}/{item.unit}</span>
                </div>
                {item.price_subcontractor && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'rgb(var(--color-text-muted))' }}>Sous-traitant</span>
                    <span style={{ color: 'rgb(var(--color-warning))' }}>{formatCurrency(item.price_subcontractor)}/{item.unit}</span>
                  </div>
                )}
              </div>
              {(item.color || item.thickness || item.warranty_years) && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.color && <span className="hm-badge hm-badge-muted text-xs">{item.color}</span>}
                  {item.thickness && <span className="hm-badge hm-badge-muted text-xs">{item.thickness}</span>}
                  {item.warranty_years && <span className="hm-badge hm-badge-success text-xs">{item.warranty_years} ans</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="hm-empty">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p>Aucun article dans cette catégorie</p>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvel Article au Catalogue" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} loading={saving}>Ajouter</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nom *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="col-span-2" />
          <Select label="Catégorie" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as MaterialCategory }))} options={categories} />
          <Input label="Unité" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="sqft, lft, unité" />
          <Input label="Prix fournisseur ($/unité)" type="number" value={form.price_supplier} onChange={e => setForm(f => ({ ...f, price_supplier: e.target.value }))} />
          <Input label="Prix client ($/unité) *" type="number" value={form.price_client} onChange={e => setForm(f => ({ ...f, price_client: e.target.value }))} />
          <Input label="Prix sous-traitant ($/unité)" type="number" value={form.price_subcontractor} onChange={e => setForm(f => ({ ...f, price_subcontractor: e.target.value }))} />
          <Input label="Marque" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
          <Input label="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <Input label="Couleur" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
          <Input label="Épaisseur" value={form.thickness} onChange={e => setForm(f => ({ ...f, thickness: e.target.value }))} placeholder='0.042"' />
          <Input label="Garantie (années)" type="number" value={form.warranty_years} onChange={e => setForm(f => ({ ...f, warranty_years: e.target.value }))} />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="col-span-2" />
        </div>
      </Modal>
    </>
  )
}
