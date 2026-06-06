import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { AuthProvider } from '@/context/AuthContext'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') redirect('/employee/dashboard')

  return (
    <AuthProvider>
      <div className="hm-layout">
        <AdminSidebar />
        <main className="hm-main">{children}</main>
      </div>
    </AuthProvider>
  )
}
