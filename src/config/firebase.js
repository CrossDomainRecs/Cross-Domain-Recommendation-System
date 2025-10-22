import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB6JXdT1Kffg0gdgs7YCXbEZ-mTZb1crmI",
  authDomain: "reclab-6493d.firebaseapp.com",
  projectId: "reclab-6493d",
  storageBucket: "reclab-6493d.firebasestorage.app",
  messagingSenderId: "408398519961",
  appId: "1:408398519961:web:4c6f8f6084330991f2a208"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
