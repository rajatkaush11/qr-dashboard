import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config';
import Login from './Login';
import Register from './Register';
import WelcomeHome from './WelcomeHome';
import Navbar from './Navbar';
import Menu from './Menu';
import TableOverview from './TableOverview';
import ItemList from './ItemList';
import Dashboard from './Dashboard';
import Orders from './Orders';
import Reports from './Reports';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('Home');

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user); // Set user on successful authentication
      } else {
        setUser(null); // Nullify user on logout or failed authentication
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
          <Route path="/menu" element={user ? <Menu /> : <Navigate to="/menu" replace />} />
          <Route path="/table" element={user ? <WelcomeHome /> : <Navigate to="/table" replace />} />
          <Route path="/category/:categoryId/items" element={user ? <ItemList /> : <Navigate to="/category/:categoryId/items" replace />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/dashboard" replace />} />
          <Route path="/orders" element={user ? <Orders /> : <Navigate to="/orders" replace />} />
          <Route path="/reports" element={user ? <Reports /> : <Navigate to="/reports" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} /> {/* Redirect to login if not authenticated */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
