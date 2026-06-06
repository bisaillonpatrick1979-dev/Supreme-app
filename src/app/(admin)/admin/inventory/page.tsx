import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/format'
import { AlertTriangle } from 'lucide-react'
import type { InventoryItem } from '@/types/database'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*, catalog_item:catalog_items(name, category)')
    .order('name')

  const lowStock = items?.filter(i => i.reorder_point && i.quantity_available <= i.reorder_point) ?? []

  return (
    <>
      <AdminHeader title="Inventaire" subtitle="Gestion des stocks de matériaux" />
      <div className="hm-content">
        {lowStock.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
            style={{ background: 'rgb(var(--color-warning) / 0.1)', border: '1px solid rgb(var(--color-warning) / 0.3)' }}>
            <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
              {lowStock.length} article{lowStock.length > 1 ? 's' : ''} sous le seuil de réapprovisionnement
            </p>
          </div>
        )}

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
                  <th>Seuil réappro.</th>
                  <th>Emplacement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {items?.map(item => {
                  const isLow = item.reorder_point && item.quantity_available <= item.reorder_point
                  return (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.sku && <p className="text-xs font-mono" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.sku}</p>}
                      </td>
                      <td><span className="text-sm">{item.category ?? '—'}</span></td>
                      <td className="font-semibold">{item.quantity_on_hand}</td>
                      <td style={{ color: 'rgb(var(--color-warning))' }}>{item.quantity_reserved > 0 ? item.quantity_reserved : '—'}</td>
                      <td className="font-bold" style={{ color: isLow ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))' }}>
                        {item.quantity_available}
                      </td>
                      <td className="text-sm">{item.unit}</td>
                      <td className="text-sm">{item.reorder_point ?? '—'}</td>
                      <td className="text-sm">{item.storage_location ?? '—'}</td>
                      <td>
                        <Badge variant={isLow ? 'danger' : 'success'}>
                          {isLow ? 'Bas' : 'OK'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!items?.length && (
            <p className="text-center py-12 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Aucun article en inventaire. Ajoutez votre premier stock.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
