// App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config';
import Login from './Login';
import Register from './Register';
import TableOverview from './TableOverview';
import Navbar from './Navbar';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={() => setUser(true)} />} />
        <Route path="/register" element={user ? <Navigate to="/login" replace /> : <Register />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

const Dashboard = () => (
  <>
    <Navbar />
    <TableOverview />
  </>
);

export default App;
