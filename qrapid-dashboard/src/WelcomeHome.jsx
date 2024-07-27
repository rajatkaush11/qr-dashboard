// WelcomeHome.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import Navbar from './Navbar'; // Make sure to import the Navbar component

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

  // Function to handle navigation clicks in the navbar
  const handleNavClick = (page) => {
    // Implement navigation logic based on 'page'
    console.log(`Navigate to ${page}`); // Placeholder for actual navigation
  };

  return (
    <>
      <Navbar activePage="home" onLinkClick={handleNavClick} />
      <div className="welcome-container">
        <h1>Welcome Home</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </>
  );
};

export default WelcomeHome;
