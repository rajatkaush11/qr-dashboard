import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config';
import Login from './Login';
import Register from './Register';
import WelcomeHome from './WelcomeHome';
import Navbar from './Navbar';
import './index.css'; // Ensure global styles are applied

function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('Table');

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);  // Set user on successful authentication
      } else {
        setUser(null);  // Nullify user on logout or failed authentication
      }
    });
  }, []);

  const handleNavClick = (page) => {
    setActivePage(page);
  };

  return (
    <Router>
      <div className="app-container">
        {user && <Navbar activePage={activePage} onLinkClick={handleNavClick} />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login onLogin={() => setUser(true)} />} />
          <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
          <Route path="/home" element={user ? <WelcomeHome /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />  // Redirect to login if not authenticated
        </Routes>
      </div>
    </Router>
  );
}

export default App;
