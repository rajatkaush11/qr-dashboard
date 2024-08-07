import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { collection, getDocs } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import WelcomeHome from './WelcomeHome';
import Navbar from './Navbar';
import Menu from './Menu';
import ItemList from './ItemList';
import Dashboard from './Dashboard';
import Orders from './Orders';
import Reports from './Reports';
import ParentComponent from './ParentComponent'; // Import ParentComponent
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('Home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleNavClick = (page) => {
    setActivePage(page);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        {user && <Navbar activePage={activePage} onLinkClick={handleNavClick} />}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login onLogin={() => setUser(true)} />} />
          <Route path="/register" element={user ? <Navigate to="/home" replace /> : <Register />} />
          <Route path="/home" element={user ? <WelcomeHome /> : <Navigate to="/login" replace />} />
          <Route path="/menu" element={user ? <Menu /> : <Navigate to="/login" replace />} />
          <Route path="/table" element={user ? <WelcomeHome /> : <Navigate to="/login" replace />} />
          <Route path="/category/:categoryId/items" element={user ? <ItemList /> : <Navigate to="/login" replace />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" replace />} />
          <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" replace />} />
          <Route path="/table/:tableNumber" element={user ? <ParentComponent /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} /> {/* Redirect to login if not authenticated */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
