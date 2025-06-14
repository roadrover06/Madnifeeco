// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyDsgfyZtzNSzWgMp8lYr2Fw95ebOjPmS48",
  authDomain: "madnifeeco-48831.firebaseapp.com",
  projectId: "madnifeeco-48831",
  storageBucket: "madnifeeco-48831.firebasestorage.app",
  messagingSenderId: "947928858179",
  appId: "1:947928858179:web:256271e321fec745945ef6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };