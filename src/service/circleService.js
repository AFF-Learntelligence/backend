import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";

const auth = getAuth(firebaseApp);

export const circleService = {
  async createCircle(uid, circleData) {
    const circlesRef = collection(db, "Circles");
    const circleDocRef = await addDoc(circlesRef, {
      creator: doc(db, "Users", uid),
      circleName: circleData.circleName,
      description: circleData.description,
      invitationLink: "",
    });

    const circleId = circleDocRef.id;
    const invitationLink = `https://yourapp.com/invite/${circleId}`;

    await updateDoc(circleDocRef, {
      invitationLink: invitationLink,
    });

    const membersRef = collection(circleDocRef, "Members");
    await setDoc(doc(membersRef, uid), {
      userId: doc(db, "Users", uid),
    });

    return invitationLink;
  },
};
