import { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'user' };

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users.');
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const startAdd = () => {
    setEditingId('');
    setForm(emptyForm);
    setError('');
    setFormOpen(true);
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setError('');
    setFormOpen(true);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = { name: form.name, email: form.email, role: form.role };
    if (form.password) payload.password = form.password;
    try {
      if (editingId) await api.put(`/users/${editingId}`, payload);
      else await api.post('/users', payload);
      setFormOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save user.');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (user.id === currentUser.id) return;
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    setError('');
    try {
      await api.delete(`/users/${user.id}`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete user.');
    }
  };

  return (
    <>
      <div className="admin-heading">
        <div><p className="eyebrow">Accounts</p><h1>Manage users</h1></div>
        <button className="button button-primary" onClick={startAdd}>Add user</button>
      </div>
      {error && !formOpen && <div className="form-error" role="alert">{error}</div>}
      {formOpen && (
        <section className="admin-form-card">
          <h2>{editingId ? 'Edit user' : 'Create user'}</h2>
          <form className="admin-form-grid" onSubmit={saveUser}>
            <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Password{editingId && <small>(leave blank to keep current)</small>}<input required={!editingId} type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></label>
            {error && <div className="form-error span-all" role="alert">{error}</div>}
            <div className="form-actions span-all">
              <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save user'}</button>
              <button type="button" className="button button-muted" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}
      <div className="table-wrap">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}{user.id === currentUser.id && <small className="you-label"> (you)</small>}</td><td>{user.email}</td>
                <td><span className={`role-badge role-${user.role}`}>{user.role}</span></td>
                <td className="table-actions"><button className="button button-muted" onClick={() => startEdit(user)}>Edit</button><button className="button button-danger" disabled={user.id === currentUser.id} onClick={() => deleteUser(user)}>Delete</button></td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan="4" className="table-empty">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
