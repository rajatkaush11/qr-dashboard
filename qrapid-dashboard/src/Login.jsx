import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase-config';
import { useNavigate } from 'react-router-dom';
import './login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();  // Notify App of login
    } catch (error) {
      setError("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="login-page">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p className="error-message">{error}</p>}
      <button className="register-btn" onClick={() => navigate('/register')}>Register</button>
    </div>
  );
};

export default Login;
