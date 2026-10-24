import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AuthPage from './pages/AuthPage';
import BrowsePage from './pages/BrowsePage';
import WatchPage from './pages/WatchPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminUsers from './pages/admin/AdminUsers';
import IntroSplash from './components/animations/IntroSplash';
import { durations, easings } from './animations/variants';
import { useAudio } from './context/AudioContext';

const INTRO_SESSION_KEY = 'cinemate_intro_seen';

const hasSeenIntro = () => {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
};

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return <Navigate to={user?.role === 'admin' ? '/admin' : user ? '/browse' : '/login'} replace />;
}

function App() {
  const [introVisible, setIntroVisible] = useState(() => !hasSeenIntro());
  const reducedMotion = useReducedMotion();
  const { startAmbient } = useAudio();
  const finishIntro = useCallback(() => setIntroVisible(false), []);

  useEffect(() => {
    if (introVisible) return undefined;
    const timer = window.setTimeout(() => { void startAmbient(); }, 0);
    return () => window.clearTimeout(timer);
  }, [introVisible, startAmbient]);

  return (
    <>
      <AnimatePresence>
        {introVisible && <IntroSplash key="site-intro" onComplete={finishIntro} />}
      </AnimatePresence>
      <motion.div
        className="app-content"
        initial={introVisible ? { opacity: 0, y: 14, scale: 0.99 } : false}
        animate={introVisible
          ? { opacity: 0, y: 14, scale: 0.99 }
          : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reducedMotion ? 0.15 : durations.contentReveal, ease: easings.smooth }}
        aria-hidden={introVisible}
      >
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<AuthPage introComplete={!introVisible} />} />
          <Route path="/signup" element={<AuthPage signup introComplete={!introVisible} />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/watch/:id" element={<WatchPage />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="movies" element={<AdminMovies />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </motion.div>
    </>
  );
}

export default App;
