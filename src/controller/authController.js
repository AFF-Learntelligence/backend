import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebaseConfig.js";
import admin from "firebase-admin";

const auth = getAuth(firebaseApp);

export async function register(request, h) {
  try {
    const { email, password } = request.payload;

    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const data = {
      email: email,
      role: "user",
    };

    const docRef = doc(db, "Users", user.uid);

    await setDoc(docRef, data);

    return h
      .response({
        status: 201,
        message: "Registration successful!",
      })
      .code(201);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      return h
        .response({
          status: 409,
          message: "Email already registered!",
        })
        .code(409);
    } else {
      console.log(error.message);
      return h
        .response({
          status: 500,
          message: "An error occurred during signup.",
        })
        .code(500);
    }
  }
}

export async function login(request, h) {
  const { email, password } = request.payload;

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    const idToken = await user.getIdToken();

    return h
      .response({
        status: 200,
        message: "Login successful!",
        idToken,
      })
      .code(200);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return h
        .response({
          status: 401,
          message: "Invalid email or password!",
        })
        .code(401);
    } else if (error.code === "auth/wrong-password") {
      return h
        .response({
          status: 401,
          message: "Invalid email or password!",
        })
        .code(401);
    } else {
      console.log(error.message);
      return h
        .response({
          status: 500,
          message: "An error occurred during login.",
        })
        .code(500);
    }
  }
}
