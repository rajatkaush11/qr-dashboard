import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'; // Replace Redirect with Navigate
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import TableOverview from './TableOverview';

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
        <Route path="/" element={user ? <TableOverview restaurantName={restaurantName} /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
