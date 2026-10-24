import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ signup = false }) {
  const { user, loading, login, signup: register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (loading) return <div className="page-loading">Loading...</div>;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/browse'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const signedInUser = signup
        ? await register({ name: form.name, email: form.email, password: form.password })
        : await login({ email: form.email, password: form.password });
      navigate(signedInUser.role === 'admin' ? '/admin' : '/browse', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to authenticate. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <Link className="site-logo auth-logo" to="/">CINEMATE</Link>
      <section className="auth-card">
        <h1>{signup ? 'Create account' : 'Sign in'}</h1>
        <p>{signup ? 'Create an account to start watching.' : 'Sign in to your movie library.'}</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          {signup && (
            <label>
              Name
              <input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
          )}
          <label>
            Email
            <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <input required type="password" minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary" disabled={submitting}>{submitting ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">
          {signup ? 'Already have an account?' : 'New here?'}{' '}
          <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link>
        </p>
      </section>
    </main>
  );
}
