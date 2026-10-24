import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import './styles.css';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AudioProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AudioProvider>
    </BrowserRouter>
  </React.StrictMode>
);
