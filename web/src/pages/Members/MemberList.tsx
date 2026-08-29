import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import apiClient from '@/lib/apiClient'
import { getRoleLabel } from '@/lib/labels'
import { useMe } from '@/context/useMe'
import ConfirmDialog from '@/components/ConfirmDialog'
import { MODULES, ACTIONS, getRolePreset, applyOverrides, matrixToRows, type ActionMatrix } from '@/lib/permissions'

interface Member {
  workspace_id: string
  user_id: string
  role: string
  joined_at: string
  user: { id: string; email: string; name: string }
}

interface UserOption {
  id: string
  email: string
  name: string
}

interface PermissionRow {
  module_key: string
  action: string
  enabled: boolean
}

const MODULE_LABEL_KEY_MAP: Record<string, string> = {
  dashboard: 'modules.dashboard',
  calendar: 'modules.calendar',
  content: 'modules.content',
  projects: 'modules.projects',
  tasks: 'modules.tasks',
  clients: 'modules.clients',
  members: 'modules.members',
  finances: 'modules.finances',
}

const ACTION_LABEL_KEY_MAP: Record<string, string> = {
  view: 'members.actions.view',
  create: 'members.actions.create',
  update: 'members.actions.update',
  delete: 'members.actions.delete',
}

export default function MemberList() {
  const { t } = useTranslation()
  const { user } = useMe()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [creatingInvite, setCreatingInvite] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [allUsers, setAllUsers] = useState<UserOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [addRole, setAddRole] = useState('cm')
  const [addingMember, setAddingMember] = useState(false)
  const [addSuccess, setAddSuccess] = useState('')

  const [permissionsModalUserId, setPermissionsModalUserId] = useState<string | null>(null)
  const [permissionsModalUserName, setPermissionsModalUserName] = useState('')
  const [modulePermissions, setModulePermissions] = useState<PermissionRow[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [permissionsError, setPermissionsError] = useState('')
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'
  const workspaceId = user?.active_workspace_id

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await apiClient.get<Member[]>('/members')
    if (res.error) {
      setError(res.error.message)
    } else {
      setMembers(res.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { queueMicrotask(loadMembers) }, [loadMembers])

  async function handleRoleChange(targetUserId: string, newRole: string) {
    if (!workspaceId) return
    const res = await apiClient.put(`/workspaces/${workspaceId}/members/${targetUserId}`, { role: newRole })
    if (res.error) {
      setError(res.error.message)
      return
    }
    setMembers((prev) => prev.map((m) => (m.user_id === targetUserId ? { ...m, role: newRole } : m)))
  }

  async function handleRemove(targetUserId: string) {
    setRemoveUserId(null)
    if (!workspaceId) return
    const res = await apiClient.delete(`/workspaces/${workspaceId}/members/${targetUserId}`)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId))
  }

  async function handleCreateInvite() {
    if (!workspaceId) return
    setCreatingInvite(true)
    setError('')
    const res = await apiClient.post<{ token: string }>(`/workspaces/${workspaceId}/invites`, {
      max_uses: 10,
      expires_in_hours: 168,
    })
    setCreatingInvite(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    if (res.data) {
      const link = `${window.location.origin}/invite/${res.data.token}`
      setInviteLink(link)
      navigator.clipboard.writeText(link).catch(() => {})
    }
  }

  async function openAddModal() {
    setSelectedUserId('')
    setAddRole('cm')
    setError('')
    setAddSuccess('')
    setShowAddModal(true)

    setLoadingUsers(true)
    const res = await apiClient.get<UserOption[]>('/users')
    setLoadingUsers(false)

    if (res.data) {
      const memberIds = new Set(members.map((m) => m.user_id))
      setAllUsers(res.data.filter((u) => !memberIds.has(u.id)))
    }
  }

  async function handleAddMember() {
    if (!workspaceId || !selectedUserId) return
    const selectedUser = allUsers.find((u) => u.id === selectedUserId)
    if (!selectedUser) return

    setAddingMember(true)
    setError('')
    setAddSuccess('')

    const res = await apiClient.post<Member>(`/workspaces/${workspaceId}/members`, {
      email: selectedUser.email,
      role: addRole,
    })

    setAddingMember(false)

    if (res.error) {
      setError(res.error.message)
      return
    }

    setAddSuccess(t('members.memberAdded'))
    setShowAddModal(false)
    loadMembers()
  }

  async function openPermissionsModal(member: Member) {
    if (!workspaceId) return
    setPermissionsModalUserId(member.user_id)
    setPermissionsModalUserName(member.user.name || member.user.email)
    setPermissionsError('')
    setModulePermissions([])
    setLoadingPermissions(true)

    const res = await apiClient.get<{ role: string; overrides: PermissionRow[] }>(
      `/workspaces/${workspaceId}/module-permissions/${member.user_id}`
    )
    setLoadingPermissions(false)

    if (res.error) {
      setPermissionsError(res.error.message)
    } else if (res.data) {
      const matrix: ActionMatrix = applyOverrides(
        getRolePreset(res.data.role),
        res.data.overrides,
      )
      setModulePermissions(matrixToRows(matrix))
    }
  }

  function toggleModulePermission(moduleKey: string, action: string) {
    setModulePermissions((prev) =>
      prev.map((p) =>
        p.module_key === moduleKey && p.action === action ? { ...p, enabled: !p.enabled } : p,
      ),
    )
  }

  async function handleSavePermissions() {
    if (!workspaceId || !permissionsModalUserId) return
    setSavingPermissions(true)
    setPermissionsError('')

    const res = await apiClient.put(
      `/workspaces/${workspaceId}/module-permissions/${permissionsModalUserId}`,
      { permissions: modulePermissions }
    )

    setSavingPermissions(false)

    if (res.error) {
      setPermissionsError(res.error.message)
      return
    }

    setPermissionsModalUserId(null)
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('members.title')}</h2>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}

      {addSuccess && (
        <div className="rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-900/40 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-4">
          {addSuccess}
        </div>
      )}

      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 mb-5 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openAddModal}
              className="rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors shadow-sm active:scale-[0.97]"
            >
              {t('members.addMember')}
            </button>
            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 transition-colors disabled:opacity-50 active:scale-[0.97]"
            >
              {creatingInvite ? t('members.creating') : t('members.createInvite')}
            </button>
          </div>
          {inviteLink && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <span className="text-xs text-green-600 font-medium">{t('members.copied')}</span>
            </div>
          )}
        </div>
      )}

      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('members.table.user')}</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('members.table.role')}</th>
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('members.table.joined')}</th>
              {isAdmin && <th className="text-right px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">{t('members.table.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.map((m) => (
              <tr key={m.user_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 flex items-center justify-center text-socialflow-700 dark:text-socialflow-300 text-xs font-semibold shrink-0">
                      {(m.user.name || m.user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{m.user.name || m.user.email}</p>
                      {m.user.name && <p className="text-xs text-slate-400">{m.user.email}</p>}
                    </div>
                  </div>
                  {m.user_id === user?.id && <span className="text-[10px] text-socialflow-600 dark:text-socialflow-400 font-medium ml-10">({t('members.you')})</span>}
                </td>
                <td className="px-5 py-3.5">
                  {isAdmin && m.user_id !== user?.id ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-900 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                    >
                      <option value="admin">{getRoleLabel('admin')}</option>
                      <option value="cm">{getRoleLabel('cm')}</option>
                      <option value="viewer">{getRoleLabel('viewer')}</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {getRoleLabel(m.role)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(m.joined_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                {isAdmin && (
                  <td className="px-5 py-3.5 text-right">
                    {m.user_id !== user?.id && (
                      <div className="flex items-center justify-end gap-3">
                        {m.role === 'admin' ? (
                          <span className="inline-flex items-center rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-socialflow-700 dark:text-socialflow-300 uppercase tracking-wider">
                            {t('members.fullAccess')}
                          </span>
                        ) : (
                          <button
                            onClick={() => openPermissionsModal(m)}
                            className="rounded-xl border border-socialflow-200 dark:border-socialflow-800 bg-socialflow-50 dark:bg-socialflow-900/30 px-3 py-1.5 text-xs font-semibold text-socialflow-700 dark:text-socialflow-300 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-colors active:scale-[0.97]"
                          >
                            {t('members.permissions')}
                          </button>
                        )}
                        <button
                          onClick={() => setRemoveUserId(m.user_id)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          {t('members.remove')}
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {members.map((m) => (
          <div key={m.user_id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 card-hover shadow-sm">
            <div className="flex items-start gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 flex items-center justify-center text-socialflow-700 dark:text-socialflow-300 text-xs font-semibold shrink-0">
                {(m.user.name || m.user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                  {m.user.name || m.user.email}
                  {m.user_id === user?.id && (
                    <span className="text-[10px] text-socialflow-600 dark:text-socialflow-400 font-medium ml-1">({t('members.you')})</span>
                  )}
                </p>
                {m.user.name && <p className="text-xs text-slate-400 truncate">{m.user.email}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {isAdmin && m.user_id !== user?.id ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs bg-white dark:bg-slate-900 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                >
                  <option value="admin">{getRoleLabel('admin')}</option>
                  <option value="cm">{getRoleLabel('cm')}</option>
                  <option value="viewer">{getRoleLabel('viewer')}</option>
                </select>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                  {getRoleLabel(m.role)}
                </span>
              )}
              <span>{new Date(m.joined_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            {isAdmin && m.user_id !== user?.id && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
                {m.role === 'admin' ? (
                  <span className="inline-flex items-center rounded-full bg-socialflow-100 dark:bg-socialflow-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-socialflow-700 dark:text-socialflow-300 uppercase tracking-wider">
                    {t('members.fullAccess')}
                  </span>
                ) : (
                  <button
                    onClick={() => openPermissionsModal(m)}
                    className="rounded-xl border border-socialflow-200 dark:border-socialflow-800 bg-socialflow-50 dark:bg-socialflow-900/30 px-3 py-1.5 text-xs font-semibold text-socialflow-700 dark:text-socialflow-300 hover:bg-socialflow-100 dark:hover:bg-socialflow-900/50 transition-colors active:scale-[0.97]"
                  >
                    {t('members.permissions')}
                  </button>
                )}
                <button
                  onClick={() => setRemoveUserId(m.user_id)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  {t('members.remove')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{t('members.addMember')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('members.selectUser')}</label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <div className="w-4 h-4 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
                    Cargando usuarios...
                  </div>
                ) : allUsers.length === 0 ? (
                  <p className="py-2.5 text-sm text-slate-500 dark:text-slate-400">{t('members.noAvailableUsers')}</p>
                ) : (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                    autoFocus
                  >
                    <option value="">{t('members.selectUserPlaceholder')}</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{t('members.selectRole')}</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 focus:border-socialflow-500 focus:outline-none focus:ring-1 focus:ring-socialflow-500"
                >
                  <option value="admin">{getRoleLabel('admin')}</option>
                  <option value="cm">{getRoleLabel('cm')}</option>
                  <option value="viewer">{getRoleLabel('viewer')}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors active:scale-[0.97]"
              >
                {t('members.cancel')}
              </button>
              <button
                onClick={handleAddMember}
                disabled={addingMember || !selectedUserId || loadingUsers}
                className="flex-1 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
              >
                {addingMember ? t('members.adding') : t('members.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {permissionsModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPermissionsModalUserId(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{t('members.modulePermissions')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{permissionsModalUserName}</p>

            {permissionsError && (
              <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
                {permissionsError}
              </div>
            )}

            {loadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-socialflow-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {MODULES.map((moduleKey) => (
                  <div
                    key={moduleKey}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                      {t(MODULE_LABEL_KEY_MAP[moduleKey])}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ACTIONS.map((action) => {
                        const enabled =
                          modulePermissions.find(
                            (p) => p.module_key === moduleKey && p.action === action,
                          )?.enabled ?? false
                        return (
                          <label
                            key={action}
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
                              enabled
                                ? 'bg-socialflow-50 dark:bg-socialflow-900/30 ring-1 ring-socialflow-200 dark:ring-socialflow-800'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => toggleModulePermission(moduleKey, action)}
                              className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-socialflow-600 dark:text-socialflow-400 focus:ring-socialflow-500 focus:ring-offset-0"
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {t(ACTION_LABEL_KEY_MAP[action])}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPermissionsModalUserId(null)}
                className="flex-1 rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors active:scale-[0.97]"
              >
                {t('members.cancel')}
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={savingPermissions || loadingPermissions}
                className="flex-1 rounded-xl bg-socialflow-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-socialflow-700 transition-colors disabled:opacity-50 shadow-sm active:scale-[0.97]"
              >
                {savingPermissions ? t('Guardando...') : t('Guardar cambios')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={removeUserId !== null}
        title={t('members.remove')}
        message={t('members.confirmRemove')}
        onConfirm={() => removeUserId && handleRemove(removeUserId)}
        onCancel={() => setRemoveUserId(null)}
      />
    </div>
  )
}
