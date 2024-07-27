import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase-config';
import Navbar from './Navbar'; // Ensure Navbar is imported correctly

const WelcomeHome = () => {
  const navigate = useNavigate();

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout Failed', error);
    }
  };

  // Function to manage navigation from the navbar
  const handleNavClick = (page) => {
    console.log(`Navigate to ${page}`); // Replace with actual navigation logic
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
