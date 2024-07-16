import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import config from "../config/config.js";
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
  async createCircle(userId, circleData) {
    const circlesRef = collection(db, "Circles");
    const circleDocRef = await addDoc(circlesRef, {
      creator: doc(db, "Users", userId),
      circleName: circleData.circleName,
      description: circleData.description,
      invitationLink: "",
    });

    const circleId = circleDocRef.id;
    const invitationLink = `${config.appUrl}/invite/${circleId}`;

    await updateDoc(circleDocRef, {
      invitationLink: invitationLink,
    });

    const membersRef = collection(circleDocRef, "Members");
    await setDoc(doc(membersRef, userId), {
      userId: doc(db, "Users", userId),
    });

    return invitationLink;
  },
  async joinCircle(userId, circleId) {
    const circleRef = doc(db, "Circles", circleId);
    const circleSnapshot = await getDoc(circleRef);

    if (!circleSnapshot.exists()) {
      return null;
    }

    const membersRef = collection(circleRef, "Members");
    const memberDocRef = doc(membersRef, userId);

    const memberSnapshot = await getDoc(memberDocRef);
    if (memberSnapshot.exists()) {
      return "already_member";
    }

    await setDoc(memberDocRef, {
      userId: doc(db, "Users", userId),
    });

    return "joined";
  },
};
