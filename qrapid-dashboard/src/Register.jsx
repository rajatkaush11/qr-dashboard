import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db, storage } from './firebase-config';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Register.css';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [timing, setTiming] = useState('');
  const [restaurantImage, setRestaurantImage] = useState(null);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('Starting registration process...');
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created with UID:', user.uid);

      // Upload restaurant image to Firebase Storage
      const imageRef = ref(storage, `restaurantImages/${user.uid}`);
      await uploadBytes(imageRef, restaurantImage);
      const imageUrl = await getDownloadURL(imageRef);

      // Save additional data in Firestore
      await setDoc(doc(db, "restaurants", user.uid), {
        restaurantName,
        address,
        description,
        timing,
        email: user.email, // Use the email from userCredential
        imageUrl // Save the image URL
      });
      console.log('Restaurant details saved in Firestore');

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
          email: user.email,
          imageUrl // Include image URL in the request body
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save data in MongoDB');
      }
      console.log('Restaurant details saved in MongoDB');

      // Display alert and redirect after successful registration
      alert('Registered successfully!');
      navigate('/login'); // Redirect to login page
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(error.message || 'Registration failed');
    }
  };

  return (
    <div className="restaurant-details">
      <button className="login-btn" onClick={() => navigate('/login')}>Login</button>
      <h2>Register Restaurant</h2>
      <form onSubmit={handleRegister}>
        <div className="input-group">
          <label>Name of the Restaurant</label>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Address of the Restaurant</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Description of the Restaurant</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Timing of the Restaurant</label>
          <input
            type="text"
            value={timing}
            onChange={(e) => setTiming(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="input-group">
          <label>Upload Restaurant Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setRestaurantImage(e.target.files[0])}
            required
          />
        </div>
        <button type="submit" className="register-btn">Register</button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
};

export default Register;
