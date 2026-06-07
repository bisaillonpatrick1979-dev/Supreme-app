'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/layout/AdminHeader'
import { Button } from '@/components/ui/Button'
import { ProjectStatusBadge, TaskStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { CheckCircle, Circle, Plus, MapPin, Calendar, DollarSign, AlertTriangle, Users, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { PhotoUpload } from '@/components/upload/PhotoUpload'
import type { Project, Client, ProjectTask, Employee } from '@/types/database'

interface ProjectEmployee {
  id: string
  employee_id: string
  role: string | null
  employee: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_type'>
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<(Project & { client: Client; tasks: ProjectTask[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', is_blocking: true })
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([])
  const [allEmployees, setAllEmployees] = useState<Pick<Employee, 'id' | 'first_name' | 'last_name'>[]>([])
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [employeeRole, setEmployeeRole] = useState('')
  const [addingEmployee, setAddingEmployee] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadProject()
    loadProjectEmployees()
    loadAllEmployees()
  }, [id])

  const loadProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*, client:clients(*), tasks:project_tasks(*)')
      .eq('id', id)
      .single()
    setProject(data as any)
    setLoading(false)
  }

  const loadProjectEmployees = async () => {
    const { data } = await supabase
      .from('project_employees')
      .select('id, employee_id, role, employee:employees(id, first_name, last_name, employee_type)')
      .eq('project_id', id)
    setProjectEmployees((data ?? []) as unknown as ProjectEmployee[])
  }

  const loadAllEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('last_name')
    setAllEmployees(data ?? [])
  }

  const addEmployee = async () => {
    if (!selectedEmployee) return
    setAddingEmployee(true)
    const { error } = await supabase.from('project_employees').insert([{
      project_id: id,
      employee_id: selectedEmployee,
      role: employeeRole || null,
    }])
    if (error) {
      toast.error(error.code === '23505' ? 'Déjà assigné à ce chantier' : error.message)
    } else {
      toast.success('Employé assigné')
      setShowEmployeeModal(false)
      setSelectedEmployee('')
      setEmployeeRole('')
      loadProjectEmployees()
    }
    setAddingEmployee(false)
  }

  const removeEmployee = async (peId: string) => {
    const { error } = await supabase.from('project_employees').delete().eq('id', peId)
    if (!error) {
      toast.success('Employé retiré du chantier')
      loadProjectEmployees()
    }
  }

  const toggleTask = async (task: ProjectTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('project_tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      completed_by: newStatus === 'completed' ? user?.id : null,
    }).eq('id', task.id)
    if (!error) loadProject()
  }

  const addTask = async () => {
    if (!taskForm.title) return
    const { error } = await supabase.from('project_tasks').insert([{
      project_id: id,
      title: taskForm.title,
      description: taskForm.description,
      is_blocking: taskForm.is_blocking,
      order_index: project?.tasks?.length ?? 0,
    }])
    if (!error) {
      toast.success('Tâche ajoutée')
      setShowTaskModal(false)
      setTaskForm({ title: '', description: '', is_blocking: true })
      loadProject()
    }
  }

  const canInvoice = project?.tasks?.every(t => !t.is_blocking || t.status === 'completed') ?? true
  const completedTasks = project?.tasks?.filter(t => t.status === 'completed').length ?? 0
  const totalTasks = project?.tasks?.length ?? 0

  if (loading) {
    return <div className="hm-content"><div className="hm-skeleton h-8 w-48 mb-4" /><div className="hm-skeleton h-64" /></div>
  }

  if (!project) return <div className="hm-content"><p>Chantier non trouvé</p></div>

  return (
    <>
      <AdminHeader
        title={project.name}
        subtitle={`${project.project_number} • ${project.client?.company_name ?? `${project.client?.first_name} ${project.client?.last_name}`}`}
      />
      <div className="hm-content">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Project details card */}
            <div className="hm-card">
              <div className="flex items-start justify-between mb-4">
                <ProjectStatusBadge status={project.status} />
                <Button variant="secondary" size="sm">Modifier</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Adresse</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {project.address}, {project.city}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Période</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                    <p className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                      {project.start_date ? formatDate(project.start_date) : 'À définir'} →{' '}
                      {project.end_date ? formatDate(project.end_date) : 'À définir'}
                    </p>
                  </div>
                </div>
                {project.contract_value && (
                  <div>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Valeur contrat</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <DollarSign className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-success))' }}>
                        {formatCurrency(project.contract_value)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {project.description && (
                <p className="text-sm mt-4 pt-4 border-t" style={{ color: 'rgb(var(--color-text-secondary))', borderColor: 'rgb(var(--color-border))' }}>
                  {project.description}
                </p>
              )}
            </div>

            {/* Tasks / Checklist */}
            <div className="hm-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                    Tâches ({completedTasks}/{totalTasks})
                  </h3>
                  {totalTasks > 0 && (
                    <div className="mt-1.5 w-48 h-1.5 rounded-full" style={{ background: 'rgb(var(--color-bg-elevated))' }}>
                      <div className="h-1.5 rounded-full transition-all" style={{
                        width: `${(completedTasks / totalTasks) * 100}%`,
                        background: 'rgb(var(--color-success))'
                      }} />
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => setShowTaskModal(true)}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>

              {!canInvoice && (
                <div className="flex items-center gap-2 p-3 rounded-lg mb-4"
                  style={{ background: 'rgb(var(--color-warning) / 0.1)', border: '1px solid rgb(var(--color-warning) / 0.3)' }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--color-warning))' }} />
                  <p className="text-sm" style={{ color: 'rgb(var(--color-warning))' }}>
                    Compléter toutes les tâches bloquantes avant de facturer
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {project.tasks?.sort((a, b) => a.order_index - b.order_index).map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: 'rgb(var(--color-bg-secondary))' }}
                    onClick={() => toggleTask(task)}
                  >
                    {task.status === 'completed'
                      ? <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-success))' }} />
                      : <Circle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--color-text-muted))' }} />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{
                        color: 'rgb(var(--color-text))',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        opacity: task.status === 'completed' ? 0.6 : 1,
                      }}>
                        {task.title}
                        {task.is_blocking && (
                          <span className="ml-2 text-xs" style={{ color: 'rgb(var(--color-warning))' }}>🔒</span>
                        )}
                      </p>
                      {task.description && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{task.description}</p>
                      )}
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                ))}
                {!project.tasks?.length && (
                  <p className="text-sm text-center py-4" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Aucune tâche. Ajoutez les étapes du chantier.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="hm-card space-y-2">
              <h3 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Actions</h3>
              <Button variant="secondary" className="w-full justify-start gap-2">
                <DollarSign className="w-4 h-4" />
                Créer une soumission
              </Button>
              <Button
                variant={canInvoice ? 'primary' : 'secondary'}
                className="w-full justify-start gap-2"
                disabled={!canInvoice}
              >
                <DollarSign className="w-4 h-4" />
                {canInvoice ? 'Créer une facture' : 'Facture bloquée'}
              </Button>
            </div>

            {/* Photos */}
            <div className="hm-card">
              <h3 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Photos du chantier</h3>
              <PhotoUpload projectId={id} />
            </div>

            {/* Team */}
            <div className="hm-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'rgb(var(--color-primary))' }} />
                  <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Équipe</h3>
                </div>
                <button
                  onClick={() => setShowEmployeeModal(true)}
                  className="p-1 rounded-lg transition-all"
                  style={{ background: 'rgb(var(--color-primary-muted))', color: 'rgb(var(--color-primary))' }}
                  title="Ajouter un employé"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {projectEmployees.length === 0 ? (
                  <p className="text-sm text-center py-3" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Aucun employé assigné
                  </p>
                ) : projectEmployees.map(pe => (
                  <div key={pe.id} className="flex items-center justify-between p-2 rounded-lg"
                    style={{ background: 'rgb(var(--color-bg-secondary))' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                        {pe.employee.first_name} {pe.employee.last_name}
                      </p>
                      {pe.role && (
                        <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{pe.role}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeEmployee(pe.id)}
                      className="p-1 rounded transition-all"
                      style={{ color: 'rgb(var(--color-danger))' }}
                      title="Retirer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Client info */}
            <div className="hm-card">
              <h3 className="font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Client</h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>
                  {project.client?.company_name ?? `${project.client?.first_name} ${project.client?.last_name}`}
                </p>
                {project.client?.phone && (
                  <p style={{ color: 'rgb(var(--color-text-secondary))' }}>{project.client.phone}</p>
                )}
                {project.client?.email && (
                  <p style={{ color: 'rgb(var(--color-text-secondary))' }}>{project.client.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showEmployeeModal}
        onClose={() => { setShowEmployeeModal(false); setSelectedEmployee(''); setEmployeeRole('') }}
        title="Assigner un employé"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEmployeeModal(false)}>Annuler</Button>
            <Button onClick={addEmployee} loading={addingEmployee} disabled={!selectedEmployee}>Assigner</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Employé *"
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            options={[
              { value: '', label: '— Choisir un employé —' },
              ...allEmployees
                .filter(emp => !projectEmployees.some(pe => pe.employee_id === emp.id))
                .map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` })),
            ]}
          />
          <Input
            label="Rôle sur ce chantier (optionnel)"
            value={employeeRole}
            onChange={e => setEmployeeRole(e.target.value)}
            placeholder="Ex: Chef d'équipe, Poseur, etc."
          />
        </div>
      </Modal>

      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Ajouter une tâche"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>Annuler</Button>
            <Button onClick={addTask}>Ajouter</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Titre de la tâche *" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Installation revêtement" />
          <Textarea label="Description" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={taskForm.is_blocking}
              onChange={e => setTaskForm(f => ({ ...f, is_blocking: e.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              🔒 Tâche bloquante (empêche la facturation si non complétée)
            </span>
          </label>
        </div>
      </Modal>
    </>
  )
}
