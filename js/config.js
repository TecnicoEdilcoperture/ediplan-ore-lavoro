// Firebase configuration
const firebaseConfig = {
    apiKey: "IL-TUO-API-KEY",
    authDomain: "il-tuo-project-id.firebaseapp.com",
    projectId: "il-tuo-project-id",
    storageBucket: "il-tuo-project-id.appspot.com",
    messagingSenderId: "IL-TUO-SENDER-ID",
    appId: "IL-TUO-APP-ID"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();