import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load dashboard.'));
  }, []);

  return (
    <>
      <div className="admin-heading">
        <div><p className="eyebrow">Administration</p><h1>Dashboard</h1></div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <section className="stats-grid">
        <article className="stat-card"><span>Movies</span><strong>{stats?.totalMovies ?? '—'}</strong><Link to="/admin/movies">Manage movies →</Link></article>
        <article className="stat-card"><span>Users</span><strong>{stats?.totalUsers ?? '—'}</strong><Link to="/admin/users">Manage users →</Link></article>
      </section>
      <p className="admin-note">Upload your own video files and poster images in the movie manager. Newly registered accounts receive the standard user role.</p>
    </>
  );
}
