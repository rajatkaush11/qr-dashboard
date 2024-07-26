import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Redirect } from 'react-router-dom';
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
        <Route path="/login" element={user ? <Redirect to="/" /> : <Login onLogin={() => setUser(true)} />} />
        <Route path="/register" element={user ? <Redirect to="/" /> : <Register />} />
        <Route path="/" element={user ? <TableOverview restaurantName={restaurantName} /> : <Redirect to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
