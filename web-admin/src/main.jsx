import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './Login.jsx';
import App from './App.jsx';
import './styles.css';

function RootApp() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));

  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          localStorage.setItem('admin_token', t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <App
      token={token}
      onLogout={() => {
        localStorage.removeItem('admin_token');
        setToken(null);
      }}
    />
  );
}

createRoot(document.getElementById('root')).render(<RootApp />);
