import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (q.length < 2) return NextResponse.json({ results: [] })

    const like = `%${q}%`

    const [
      { data: clients },
      { data: projects },
      { data: invoices },
      { data: quotes },
    ] = await Promise.all([
      supabase.from('clients')
        .select('id, first_name, last_name, company_name, email, lead_status')
        .or(`company_name.ilike.${like},first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
        .limit(4),
      supabase.from('projects')
        .select('id, name, project_number, status, city')
        .or(`name.ilike.${like},project_number.ilike.${like},city.ilike.${like}`)
        .limit(4),
      supabase.from('invoices')
        .select('id, invoice_number, total, status')
        .ilike('invoice_number', like)
        .limit(3),
      supabase.from('quotes')
        .select('id, quote_number, status')
        .ilike('quote_number', like)
        .limit(3),
    ])

    const results = [
      ...(clients ?? []).map(c => ({
        type: 'client' as const,
        id: c.id,
        label: c.company_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
        subtitle: c.email ?? c.lead_status ?? '',
        href: '/admin/crm',
      })),
      ...(projects ?? []).map(p => ({
        type: 'project' as const,
        id: p.id,
        label: p.name,
        subtitle: `${p.project_number} • ${p.city ?? ''}`,
        href: `/admin/projects/${p.id}`,
      })),
      ...(invoices ?? []).map(inv => ({
        type: 'invoice' as const,
        id: inv.id,
        label: inv.invoice_number,
        subtitle: `Facture • ${inv.status}`,
        href: `/admin/billing/${inv.id}`,
      })),
      ...(quotes ?? []).map(q => ({
        type: 'quote' as const,
        id: q.id,
        label: q.quote_number,
        subtitle: `Devis • ${q.status}`,
        href: `/admin/billing/quotes/${q.id}`,
      })),
    ]

    return NextResponse.json({ results })
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ results: [] })
  }
}
