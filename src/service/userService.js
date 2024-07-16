import { getAuth, updateEmail, updatePassword } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
} from "firebase/firestore";

const auth = getAuth(firebaseApp);

export const userService = {
  async updateUserProfile(uid, updateData) {
    const docRef = doc(db, "Users", uid);
    await updateDoc(docRef, updateData);
  },

  async updateEmail(user, email) {
    await updateEmail(user, email);
  },

  async updatePassword(user, password) {
    await updatePassword(user, password);
  },

  async getUserProfile(uid) {
    const docRef = doc(db, "Users", uid);
    const docSnapshot = await getDoc(docRef);

    if (docSnapshot.exists()) {
      return docSnapshot.data();
    } else {
      return null;
    }
  },

  async getUserCourses(uid) {
    const docRef = doc(db, "Users", uid);
    const coursesRef = collection(docRef, "Courses");
    const coursesSnapshot = await getDocs(coursesRef);
    return coursesSnapshot.docs.map((doc) => doc.data());
  },
};
