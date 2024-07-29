import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Existing frontend Firebase configuration
const frontendFirebaseConfig = {
  apiKey: "AIzaSyB_EztMkylp3MDgSAaayedXLNO106NicY8",
  authDomain: "qr-dashboard-1107.firebaseapp.com",
  projectId: "qr-dashboard-1107",
  storageBucket: "qr-dashboard-1107.appspot.com",
  messagingSenderId: "625009659509",
  appId: "1:625009659509:web:155c88e41039dce38ab23c"
};

// Backend Firestore configuration
const backendFirebaseConfig = {
  apiKey: "AIzaSyByJxaYr3776NTja95y2N8iYOmPRDJIZG0",
  authDomain: "customerdbqr.firebaseapp.com",
  projectId: "customerdbqr",
  storageBucket: "customerdbqr.appspot.com",
  messagingSenderId: "657176898239",
  appId: "1:657176898239:web:5c10dc35e0cf9929a4f40a"
};

// Initialize the frontend Firebase app
const frontendApp = getApps().length === 0 ? initializeApp(frontendFirebaseConfig) : getApp();
const frontendAuth = getAuth(frontendApp);
const frontendDb = getFirestore(frontendApp);

// Initialize the backend Firebase app
const backendApp = getApps().length < 2 ? initializeApp(backendFirebaseConfig, 'backend') : getApp('backend');
const backendDb = getFirestore(backendApp);

export { frontendAuth as auth, frontendDb as db, backendDb };
