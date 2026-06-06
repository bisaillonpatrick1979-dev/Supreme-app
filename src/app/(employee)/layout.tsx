import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeSidebar } from '@/components/layout/EmployeeSidebar'
import { AuthProvider } from '@/context/AuthContext'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/employee-pin')

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role === 'admin') redirect('/admin/dashboard')

  return (
    <AuthProvider>
      <div className="hm-layout">
        <EmployeeSidebar />
        <main className="hm-main">{children}</main>
      </div>
    </AuthProvider>
  )
}
