import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'

interface Project {
  id: string
  name: string
  description: string
  start_date: string | null
  end_date: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

interface WorkspaceMember {
  user_id: string
  user: { id: string; email: string; name: string }
}

export default function ProjectList() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Record<string, WorkspaceMember>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await apiClient.get<Project[]>('/projects')
    if (res.error) {
      setError(res.error.message)
    } else {
      setProjects(res.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProjects()
    apiClient.get<WorkspaceMember[]>('/members').then((res) => {
      if (res.data) {
        const map: Record<string, WorkspaceMember> = {}
        res.data.forEach((m) => { map[m.user_id] = m })
        setMembers(map)
      }
    })
  }, [loadProjects])

  async function handleDelete(id: string) {
    const res = await apiClient.delete(`/projects/${id}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="text-2xl font-bold text-slate-900">{t('projects.title')}</h2>
        <Link
          to="/dashboard/projects/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-all shadow-sm active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('projects.newProject')}
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 sm:p-16 text-center">
          <p className="text-slate-500">{t('projects.noProjects')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <Link
                  to={`/dashboard/projects/${project.id}/edit`}
                  className="font-semibold text-slate-900 hover:text-socialflow-600 transition-colors"
                >
                  {project.name}
                </Link>
              </div>
              {project.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
                {project.start_date && <span>▶ {project.start_date}</span>}
                {project.end_date && <span>◼ {project.end_date}</span>}
                {project.assignee_id && (
                  <span>👤 {members[project.assignee_id]?.user?.name || members[project.assignee_id]?.user?.email || project.assignee_id}</span>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Link
                  to={`/dashboard/projects/${project.id}/edit`}
                  className="text-xs text-socialflow-600 hover:text-socialflow-700 font-semibold"
                >
                  {t('projects.edit')}
                </Link>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold"
                >
                  {t('projects.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
