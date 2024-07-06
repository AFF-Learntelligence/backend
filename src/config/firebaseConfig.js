import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import admin from "firebase-admin";
import config from "./config.js";

const firebaseApp = initializeApp(config.firebaseConfig);
admin.initializeApp({
  credential: admin.credential.cert(config.firebaseAdminConfig),
});

const db = getFirestore(firebaseApp);

export { db, firebaseApp };
