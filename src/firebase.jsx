import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsvHNj3ygoDMLL6DWkaJsnB5QVYy1eOmU",
  authDomain: "poll-app-1f7b2.firebaseapp.com",
  projectId: "poll-app-1f7b2",
  storageBucket: "poll-app-1f7b2.firebasestorage.app",
  messagingSenderId: "871982342674",
  appId: "1:871982342674:web:93553d72d051f7072c2ecb",
  measurementId: "G-9QWJDSEHLM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
