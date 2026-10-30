import { useState } from 'react';
import { fetchUsers } from '@/api/users';
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog';
import UserFormDialog from '@/components/users/UserFormDialog';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import SelectField from '@/components/ui/SelectField';
import Spinner from '@/components/ui/Spinner';
import TextField from '@/components/ui/TextField';
import { ROLE_BADGE, ROLE_LABELS, ROLE_LIST } from '@/config/role';
import { useAuth } from '@/hooks/useAuth';
import { useFetch } from '@/hooks/useFetch';
import { getErrorMessage } from '@/utils/error';
import { formatDateTime } from '@/utils/formate';

export default function Users() {
  const { user: me } = useAuth();
  const users = useFetch(fetchUsers, []);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState('');

  const query = search.trim().toLowerCase();
  const rows = (users.data ?? []).filter(
    (user) =>
      (!roleFilter || user.role === roleFilter) &&
      (!query ||
        user.username.toLowerCase().includes(query) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(query)),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Users</h1>
          <p className="text-sm text-ink-soft">Kaun login kar sakta hai aur uska role. Sirf owner yahan kaam kar sakta hai.</p>
        </div>
        <Button size="sm" onClick={() => setDialog({ type: 'form', user: null })}>
          Naya user
        </Button>
      </header>

      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-sand-300">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <TextField className="w-full max-w-xs" label="Dhoondhein" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Username ya naam" />
          <SelectField label="Role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="w-44">
            <option value="">Sab</option>
            {ROLE_LIST.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </SelectField>
        </div>

        {users.loading ? (
          <div className="flex items-center gap-3 py-4 text-ink-soft" role="status">
            <Spinner className="h-5 w-5 text-marigold-600" />
            <span className="text-sm font-semibold">Users aa rahe hain...</span>
          </div>
        ) : !users.data ? (
          <div className="space-y-3">
            <Alert tone="error">{getErrorMessage(users.error)}</Alert>
            <Button onClick={users.reload}>Dobara koshish karein</Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">Koi user nahi mila.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-sand-300 text-xs font-bold uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Aakhri login</th>
                  <th className="py-2 pr-3">Haalat</th>
                  <th className="py-2 text-right">Kaam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {rows.map((user) => (
                  <tr key={user.id} className={user.is_active ? '' : 'opacity-60'}>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-ink">{user.username}</span>
                      {user.id === me?.id && <span className="ml-2 text-xs text-ink-soft">(aap)</span>}
                      <span className="block text-xs text-ink-soft">{`${user.first_name} ${user.last_name}`.trim() || user.phone || '-'}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_BADGE[user.role] ?? ''}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{user.last_login ? formatDateTime(user.last_login) : 'Kabhi nahi'}</td>
                    <td className="py-2.5 pr-3">
                      {user.is_active ? (
                        <span className="rounded-full bg-lagoon-100 px-2 py-0.5 text-xs font-bold text-lagoon-800">Chalu</span>
                      ) : (
                        <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs font-bold text-ink-soft">Band</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'form', user })}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'reset', user })}>
                          Password reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'form' && (
        <UserFormDialog
          user={dialog.user}
          isSelf={dialog.user?.id === me?.id}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            setNotice('Mehfooz ho gaya.');
            users.reload();
          }}
        />
      )}
      {dialog?.type === 'reset' && (
        <ResetPasswordDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onDone={(message) => {
            setDialog(null);
            setNotice(message);
            users.reload();
          }}
        />
      )}
    </div>
  );
}