// Login.jsx
import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase-config';
import './login.css';  // Importing the CSS for the Login component

const Login = () => {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert('Logged in with Google!');
    } catch (error) {
      console.error('Error logging in with Google', error);
    }
  };

  return (
    <div className="login-page">
      <h2>Login</h2>
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
};

export default Login;
