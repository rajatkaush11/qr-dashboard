import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, setDoc } from 'firebase/firestore';
import './register.css';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [timing, setTiming] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional data in Firestore
      await setDoc(doc(db, "restaurants", user.uid), {
        restaurantName,
        address,
        description,
        timing,
        email: user.email // Use the email from userCredential
      });

      // Save additional data in MongoDB
      const response = await fetch(`${apiBaseUrl}/api/restaurant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: user.uid,
          restaurantName,
          address,
          description,
          timing,
          email: user.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save data in MongoDB');
      }

      // Display alert and redirect after successful registration
      alert('Registered successfully!');
      navigate('/login'); // Redirect to login page
    } catch (error) {
      setMessage(error.message || 'Registration failed');
    }
  };

  return (
    <div className="restaurant-details">
      <h2>Register Restaurant</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Name of the Restaurant"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Address of the Restaurant"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description of the Restaurant"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Timing of the Restaurant"
          value={timing}
          onChange={(e) => setTiming(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Register</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default Register;
