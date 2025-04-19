// Import Firebase core + modules dont tu as besoin
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // L'importation de where doit être ici

// Config Firebase (copiée depuis la console)
const firebaseConfig = {
  apiKey: "AIzaSyDBp7MQpseHLoiN4H5iVBXH8Zpxy2gBp2c",
  authDomain: "home-inventory-335f0.firebaseapp.com",
  projectId: "home-inventory-335f0",
  storageBucket: "home-inventory-335f0.firebasestorage.app",
  messagingSenderId: "475543383364",
  appId: "1:475543383364:web:0b57e78d77ea50b4277b11",
  measurementId: "G-NQ4DKLB7NF"
};

// Init Firebase
const app = initializeApp(firebaseConfig);

// Auth et Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;