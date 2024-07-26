import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase-config';
import { doc, setDoc } from 'firebase/firestore';
import './register.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [timing, setTiming] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Save additional data in Firestore
      await setDoc(doc(db, "restaurants", user.uid), {
        restaurantName,
        address,
        description,
        timing,
        email
      });
      alert('Registered successfully!');
    } catch (error) {
      setMessage(error.message || 'Registration failed');
    }
  };

  return (
    <div className="restaurant-details">
      <h2>Register Restaurant</h2>
      <form onSubmit={handleRegister}>
        <input type="text" placeholder="Name of the Restaurant" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required />
        <input type="text" placeholder="Address of the Restaurant" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <input type="text" placeholder="Description of the Restaurant" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input type="text" placeholder="Timing of the Restaurant" value={timing} onChange={(e) => setTiming(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Register</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
};

export default Register;