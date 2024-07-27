// WelcomeHome.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase-config';

const WelcomeHome = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout Failed', error);
    }
  };

  return (
    <div>
      <h1>Welcome Home</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default WelcomeHome;
