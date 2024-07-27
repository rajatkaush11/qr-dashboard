// App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import TableOverview from './TableOverview';
import Navbar from './Navbar'; // Make sure you have this component

function App() {
  const [user, setUser] = useState(null);
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const docRef = doc(db, "restaurants", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRestaurantName(docSnap.data().restaurantName);
        }
      } else {
        setUser(null);
      }
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={() => setUser(true)} />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={user ? <Dashboard restaurantName={restaurantName} /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

const Dashboard = ({ restaurantName }) => (
  <>
    <Navbar />
    <TableOverview restaurantName={restaurantName} />
  </>
);

export default App;
