import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/animations/LoadingScreen';
import { authEntrance, authItem, durations, easings } from '../animations/variants';
import AudioToggle from '../components/AudioToggle';

export default function AuthPage({ signup = false, introComplete = true }) {
  const { user, loading, login, signup: register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  if (loading) return <div className="page-loading">Loading...</div>;
  if (user && !submitting) return <Navigate to={user.role === 'admin' ? '/admin' : '/browse'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const startedAt = Date.now();
    setSubmitting(true);
    setShowLoading(true);
    setError('');
    try {
      const signedInUser = signup
        ? await register({ name: form.name, email: form.email, password: form.password })
        : await login({ email: form.email, password: form.password });
      const remainingLoadingTime = durations.authLoadingMinimum - (Date.now() - startedAt);
      if (remainingLoadingTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingLoadingTime));
      }
      setShowLoading(false);
      if (!reducedMotion) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      navigate(signedInUser.role === 'admin' ? '/admin' : '/browse', { replace: true });
    } catch (requestError) {
      setShowLoading(false);
      setError(requestError.response?.data?.message || 'Unable to authenticate. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <motion.div
        className="auth-backdrop-glow"
        aria-hidden="true"
        animate={reducedMotion ? { opacity: 0.6 } : { opacity: [0.35, 0.75, 0.35], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="auth-content"
        variants={authEntrance}
        initial={introComplete ? false : 'hidden'}
        animate={introComplete ? 'visible' : 'hidden'}
      >
        <motion.div variants={authItem}>
          <Link className="site-logo auth-logo" to="/">CINEMATE</Link>
        </motion.div>
        <motion.section className="auth-card" variants={authItem}>
          <motion.h1 variants={authItem}>{signup ? 'Create account' : 'Sign in'}</motion.h1>
          <motion.p variants={authItem}>{signup ? 'Create an account to start watching.' : 'Sign in to your movie library.'}</motion.p>
          <motion.form
            className="form-stack"
            onSubmit={handleSubmit}
            animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, ease: easings.smooth }}
          >
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
            <motion.button className="button button-primary" disabled={submitting} whileHover={reducedMotion ? undefined : { scale: 1.025 }} whileTap={reducedMotion ? undefined : { scale: 0.97 }}>
              {signup ? 'Create account' : 'Sign in'}
            </motion.button>
          </motion.form>
          <motion.p className="auth-switch" variants={authItem}>
            {signup ? 'Already have an account?' : 'New here?'}{' '}
            <Link to={signup ? '/login' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link>
          </motion.p>
        </motion.section>
      </motion.div>
      <AudioToggle floating />
      <AnimatePresence>{showLoading && <LoadingScreen key="auth-loading" />}</AnimatePresence>
    </main>
  );
}
