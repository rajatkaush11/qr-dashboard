import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase-config';

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
    <div>
      <h2>Login</h2>
      <button onClick={handleGoogleLogin}>Login with Google</button>
    </div>
  );
};

export default Login;
