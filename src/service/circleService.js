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

  async getCircleDetails(circleId) {
    const circleRef = doc(db, "Circles", circleId);
    const circleSnapshot = await getDoc(circleRef);

    if (!circleSnapshot.exists()) {
      return null;
    }

    const circleData = circleSnapshot.data();

    // Fetch members asynchronously using memberService
    const membersPromise = getMembers(circleRef, circleData.creator.id);

    // Fetch courses asynchronously using courseService
    const coursesPromise = getCourses(circleRef);

    // Wait for both promises to resolve
    const [members, courses] = await Promise.all([
      membersPromise,
      coursesPromise,
    ]);

    return { ...circleData, members, courses };
  },
};

async function getMembers(circleRef, creatorId) {
  const membersCollectionRef = collection(circleRef, "Members");
  const membersSnapshot = await getDocs(membersCollectionRef);
  const members = [];

  for (const memberDoc of membersSnapshot.docs) {
    const memberData = memberDoc.data();
    const userRef = memberData.userId;
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      let role = "User";

      if (userDoc.id === creatorId) {
        role = "Creator";
      }

      members.push({
        memberId: userDoc.id,
        name: userData.name,
        role: role,
      });
    }
  }

  return members;
}

async function getCourses(circleRef) {
  const coursesCollectionRef = collection(circleRef, "Courses");
  const coursesSnapshot = await getDocs(coursesCollectionRef);
  const courses = [];

  for (const courseDoc of coursesSnapshot.docs) {
    const courseId = courseDoc.id;
    const courseData = courseDoc.data();
    const courseRef = courseData.courseId;
    const courseDoc = await getDoc(courseRef);

    if (courseDoc.exists()) {
      const courseData = courseDoc.data();
      courses.push({
        courseId: courseId,
        courseData: courseDoc.id,
      });
    }
  }

  return courses;
}
