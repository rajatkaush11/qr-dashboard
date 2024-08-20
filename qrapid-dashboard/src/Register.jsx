import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, storage } from './firebase-config';
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
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Base URL from environment variable

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('Starting registration process...');

    try {
      // Create user with email and password in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created with UID:', user.uid);

      let imageUrl = ''; // Default to an empty string if no image is uploaded

      // Check if an image is selected
      if (restaurantImage) {
        // Upload restaurant image to Firebase Storage
        const imageRef = ref(storage, `restaurantImages/${user.uid}`);
        await uploadBytes(imageRef, restaurantImage);
        imageUrl = await getDownloadURL(imageRef);
        console.log('Image uploaded to Firebase Storage with URL:', imageUrl);
      }

      // Save restaurant details in MongoDB
      const response = await fetch(`${apiBaseUrl}/restaurant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid, // Include UID
          restaurantName,
          address,
          description,
          timing,
          email: user.email, // Include email
          password, // Include password (consider hashing on the backend)
          imageUrl, // Include image URL in the request body
        }),
      });

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save data in MongoDB:', errorData);
        throw new Error('Failed to save data in MongoDB');
      }

      console.log('Restaurant details saved in MongoDB successfully');
      const responseData = await response.json();
      console.debug('MongoDB response:', responseData); // Debug log added

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
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setRestaurantImage(e.target.files[0])}
        />
        <button type="submit">Register</button>
        {message && <p className="message">{message}</p>}
      </form>
      <button className="login-btn" onClick={() => navigate('/login')}>Back To Login</button>
    </div>
  );
};

export default Register;
