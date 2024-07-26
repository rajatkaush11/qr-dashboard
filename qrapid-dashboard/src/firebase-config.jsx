import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyB_EztMkylp3MDgSAaayedXLNO106NicY8",
    authDomain: "qr-dashboard-1107.firebaseapp.com",
    projectId: "qr-dashboard-1107",
    storageBucket: "qr-dashboard-1107.appspot.com",
    messagingSenderId: "625009659509",
    appId: "1:625009659509:web:155c88e41039dce38ab23c"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, db };
