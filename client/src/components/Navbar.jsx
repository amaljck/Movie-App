import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AudioToggle from './AudioToggle';

export default function Navbar({ admin = false }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const navigate = useNavigate();

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(`/browse${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
  };

  return (
    <header className="site-nav">
      <Link to={admin ? '/admin' : '/browse'} className="site-logo">CINEMATE</Link>
      {admin ? (
        <nav className="admin-nav">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/movies">Movies</Link>
          <Link to="/admin/users">Users</Link>
        </nav>
      ) : (
        <form className="nav-search" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="Search titles or descriptions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search movies"
          />
          <button type="submit" aria-label="Submit search">⌕</button>
        </form>
      )}
      <div className="profile-menu">
        <button className="profile-trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>
          <span className="profile-initial">{user?.name?.charAt(0).toUpperCase()}</span>
          <span>{user?.name}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {menuOpen && (
          <div className="profile-dropdown">
            <span>{user?.email}</span>
            {user?.role === 'admin' && <Link to="/admin">Admin dashboard</Link>}
            <button onClick={() => { logout(); navigate('/login', { replace: true }); }}>Log out</button>
          </div>
        )}
      </div>
      <AudioToggle />
    </header>
  );
}
