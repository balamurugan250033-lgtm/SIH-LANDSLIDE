import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login.jsx';
import App from './App.jsx';
import './styles.css';

function getToken() { return localStorage.getItem('admin_token'); }

createRoot(document.getElementById('root')).render(
  getToken() ? <AppWrapper /> : <LoginPage />
);

function AppWrapper() {
  const [token, setToken] = useState(getToken());
  if (!token) return <LoginPage />;
  return <App token={token} onLogout={() => { localStorage.removeItem('admin_token'); setToken(null); }} />;
}

function LoginPage() {
  return <Login onLogin={(t) => { localStorage.setItem('admin_token', t); window.location.reload(); }} />;
}
