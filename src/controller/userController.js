import { getAuth, updateEmail, updatePassword } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const auth = getAuth(firebaseApp);

export async function updateUserProfile(request, h) {
  try {
    const { name, phone } = request.payload;

    const { uid } = request.auth;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;

    const docRef = doc(db, "Users", uid);
    await updateDoc(docRef, updateData);

    return h
      .response({
        status: 200,
        message: "User profile updated successfully.",
      })
      .code(200);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message:
          "An error occurred while updating your profile. Please try again later.",
      })
      .code(500);
  }
}

export async function updateEmailPassUser(request, h) {
  try {
    const { email, password } = request.payload;

    auth.updateCurrentUser;

    const user = auth.currentUser;

    if (email) {
      await updateEmail(user, email);

      const { uid } = request.auth;
      const updateData = {
        email: email,
      };
      const docRef = doc(db, "Users", uid);
      await updateDoc(docRef, updateData);

      return h
        .response({
          status: 200,
          message: "Email updated successfully.",
        })
        .code(200);
    }

    if (password) {
      await updatePassword(user, password);
      return h
        .response({
          status: 200,
          message: "Password updated successfully.",
        })
        .code(200);
    }
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message:
          "An error occurred while updating your email or password. Please try again later.",
      })
      .code(500);
  }
}
