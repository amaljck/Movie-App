import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('movie_token') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('movie_token');
        if (active) {
          setToken('');
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const acceptSession = ({ token: nextToken, user: nextUser }) => {
    localStorage.setItem('movie_token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    acceptSession(data);
    return data.user;
  };

  const signup = async (details) => {
    const { data } = await api.post('/auth/signup', details);
    acceptSession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('movie_token');
    setToken('');
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login,
    signup,
    logout,
  }), [token, user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
