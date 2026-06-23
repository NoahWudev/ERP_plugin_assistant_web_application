import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Shield, Users, Building2, Plus, Pencil, Loader2,
  Check, X, UserPlus, Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AdminRole, AdminTeam, AdminUser } from '../types/admin';
import { ROLE_LABELS } from '../types/admin';
import {
  addTeamMember,
  createAdminTeam,
  createAdminUser,
  fetchAdminRoles,
  fetchAdminTeams,
  fetchAdminUsers,
  removeTeamMember,
  updateAdminUser,
} from '../utils/adminApi';

type TabId = 'users' | 'teams';

interface AdminPageProps {
  onBack: () => void;
}

interface UserFormState {
  username: string;
  password: string;
  displayName: string;
  phone: string;
  email: string;
  roleCodes: string[];
  isActive: boolean;
}

const EMPTY_FORM: UserFormState = {
  username: '',
  password: '',
  displayName: '',
  phone: '',
  email: '',
  roleCodes: ['sales'],
  isActive: true,
};

export default function AdminPage({ onBack }: AdminPageProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [userModal, setUserModal] = useState<'create' | { edit: AdminUser } | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [memberDrafts, setMemberDrafts] = useState<Record<string, { userId: string; roleInTeam: 'lead' | 'assistant' }>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRows, roleRows, teamRows] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminRoles(),
        fetchAdminTeams(),
      ]);
      setUsers(userRows);
      setRoles(roleRows);
      setTeams(teamRows);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '載入失敗', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateUser = () => {
    setForm(EMPTY_FORM);
    setUserModal('create');
  };

  const openEditUser = (u: AdminUser) => {
    setForm({
      username: u.username,
      password: '',
      displayName: u.displayName,
      phone: u.phone ?? '',
      email: u.email ?? '',
      roleCodes: [...u.roles],
      isActive: u.isActive,
    });
    setUserModal({ edit: u });
  };

  const closeUserModal = () => {
    setUserModal(null);
    setForm(EMPTY_FORM);
  };

  const toggleRole = (code: string) => {
    setForm((prev) => ({
      ...prev,
      roleCodes: prev.roleCodes.includes(code)
        ? prev.roleCodes.filter((r) => r !== code)
        : [...prev.roleCodes, code],
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userModal) return;
    if (userModal === 'create' && form.password.length < 8) {
      showToast('密碼至少 8 碼', 'error');
      return;
    }
    if (!form.displayName.trim()) {
      showToast('請填寫顯示名稱', 'error');
      return;
    }

    setSaving(true);
    try {
      if (userModal === 'create') {
        await createAdminUser({
          username: form.username.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          roleCodes: form.roleCodes,
        });
        showToast('已建立使用者');
      } else {
        await updateAdminUser(userModal.edit.id, {
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          password: form.password || undefined,
          roleCodes: form.roleCodes,
          isActive: form.isActive,
        });
        showToast('已更新使用者');
      }
      closeUserModal();
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '儲存失敗', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await createAdminTeam(newTeamName.trim());
      setNewTeamName('');
      showToast('已建立業務小組');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '建立失敗', 'error');
    }
  };

  const handleAddMember = async (teamId: string) => {
    const draft = memberDrafts[teamId];
    if (!draft?.userId) {
      showToast('請選擇使用者', 'error');
      return;
    }
    try {
      await addTeamMember(teamId, draft.userId, draft.roleInTeam);
      setMemberDrafts((prev) => ({ ...prev, [teamId]: { userId: '', roleInTeam: 'assistant' } }));
      showToast('已加入小組成員');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加入失敗', 'error');
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('確定要移除此成員？')) return;
    try {
      await removeTeamMember(teamId, userId);
      showToast('已移除成員', 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '移除失敗', 'error');
    }
  };

  const teamNameById = Object.fromEntries(teams.map((t) => [t.id, t.name]));

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="返回報價系統"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950">系統管理</h1>
              <p className="text-xs text-slate-500">帳號、角色與業務小組設定（僅管理員）</p>
            </div>
          </div>
          {currentUser && (
            <div className="text-xs text-slate-500">
              登入：<span className="font-semibold text-slate-700">{currentUser.displayName}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="flex w-full max-w-md bg-slate-200/60 p-1 rounded-xl border border-slate-200/80 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            使用者
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'teams' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            業務小組
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            載入管理資料…
          </div>
        ) : activeTab === 'users' ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">使用者清單</h2>
              <button
                type="button"
                onClick={openCreateUser}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                新增使用者
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4">帳號</th>
                    <th className="py-3 px-4">顯示名稱</th>
                    <th className="py-3 px-4">角色</th>
                    <th className="py-3 px-4">所屬小組</th>
                    <th className="py-3 px-4">狀態</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{u.username}</td>
                      <td className="py-3 px-4 text-slate-700">{u.displayName}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((code) => (
                            <span
                              key={code}
                              className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold"
                            >
                              {ROLE_LABELS[code] ?? code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {u.teamIds.length === 0
                          ? '—'
                          : u.teamIds.map((id) => teamNameById[id] ?? id.slice(0, 8)).join('、')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.isActive ? '啟用' : '停用'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-violet-600 hover:bg-violet-50 rounded-lg cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          編輯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <form
              onSubmit={handleCreateTeam}
              className="bg-white border border-slate-200 rounded-2xl shadow-3xs p-5 flex flex-col sm:flex-row gap-3 items-end"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">新增業務小組</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="小組名稱，例如：北區業務一組"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                建立小組
              </button>
            </form>

            {teams.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">尚無業務小組</div>
            ) : (
              teams.map((team) => {
                const draft = memberDrafts[team.id] ?? { userId: '', roleInTeam: 'assistant' as const };
                const memberIds = new Set(team.members.map((m) => m.userId));
                const availableUsers = users.filter((u) => !memberIds.has(u.id));

                return (
                  <div key={team.id} className="bg-white border border-slate-200 rounded-2xl shadow-3xs p-5">
                    <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-violet-600" />
                      {team.name}
                      <span className="text-[10px] font-normal text-slate-400">
                        {team.members.length} 位成員
                      </span>
                    </h3>

                    {team.members.length === 0 ? (
                      <p className="text-xs text-slate-400 mb-4">尚無成員</p>
                    ) : (
                      <ul className="space-y-2 mb-4">
                        {team.members.map((m) => (
                          <li
                            key={m.userId}
                            className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{m.displayName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {m.username} · {m.roleInTeam === 'lead' ? '組長' : '助理'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRemoveMember(team.id, m.userId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="移除成員"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
                      <select
                        value={draft.userId}
                        onChange={(e) =>
                          setMemberDrafts((prev) => ({
                            ...prev,
                            [team.id]: { ...draft, userId: e.target.value },
                          }))
                        }
                        className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="">選擇使用者加入…</option>
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName} ({u.username})
                          </option>
                        ))}
                      </select>
                      <select
                        value={draft.roleInTeam}
                        onChange={(e) =>
                          setMemberDrafts((prev) => ({
                            ...prev,
                            [team.id]: {
                              ...draft,
                              roleInTeam: e.target.value as 'lead' | 'assistant',
                            },
                          }))
                        }
                        className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-violet-500"
                      >
                        <option value="lead">組長</option>
                        <option value="assistant">助理</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleAddMember(team.id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl cursor-pointer shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        加入
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {userModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">
                {userModal === 'create' ? '新增使用者' : `編輯：${userModal.edit.username}`}
              </h3>
              <button
                type="button"
                onClick={closeUserModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {userModal === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">帳號 *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">顯示名稱 *</label>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {userModal === 'create' ? '密碼 *' : '重設密碼（留空則不變更）'}
                </label>
                <input
                  type="password"
                  required={userModal === 'create'}
                  minLength={userModal === 'create' ? 8 : undefined}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  autoComplete="new-password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">電話</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">角色</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.code}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs ${
                        form.roleCodes.includes(role.code)
                          ? 'border-violet-300 bg-violet-50 text-violet-900'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.roleCodes.includes(role.code)}
                        onChange={() => toggleRole(role.code)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="font-semibold">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {userModal !== 'create' && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    disabled={userModal.edit.id === currentUser?.id}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  帳號啟用
                  {userModal.edit.id === currentUser?.id && (
                    <span className="text-slate-400">（無法停用自己的帳號）</span>
                  )}
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
