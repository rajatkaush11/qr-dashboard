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
import TableDetails from './TableDetails'; // Import TableDetails
import ItemList from './ItemList';
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
          <Route path="/menu" element={user ? <Menu /> : <Navigate to="/login" replace />} />
          <Route path="/table" element={user ? <TableOverview /> : <Navigate to="/login" replace />} /> {/* Update this route */}
          <Route path="/table/:tableNumber" element={user ? <TableDetails /> : <Navigate to="/login" replace />} /> {/* New route for TableDetails */}
          <Route path="/category/:categoryId/items" element={user ? <ItemList /> : <Navigate to="/login" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} /> {/* Redirect to login if not authenticated */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
