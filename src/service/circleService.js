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
  query,
} from "firebase/firestore";

const auth = getAuth(firebaseApp);

export const circleService = {
  async createCircle(userId, circleData) {
    const circlesRef = collection(db, "Circles");
    const circleDocRef = await addDoc(circlesRef, {
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

    return {
      circleId: circleId,
      invitationLink: invitationLink,
    };
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

  async getCircleDetails(circleId, userId) {
    const circleRef = doc(db, "Circles", circleId);
    const circleSnapshot = await getDoc(circleRef);

    if (!circleSnapshot.exists()) {
      return null;
    }

    // Check if user is a member of the circle
    const memberRef = collection(circleRef, "Members");
    const memberDocRef = doc(memberRef, userId);
    const memberSnapshot = await getDoc(memberDocRef);

    if (!memberSnapshot.exists()) {
      return "not_a_member";
    }

    const circleData = circleSnapshot.data();

    // Fetch members asynchronously using memberService
    const membersPromise = getMembers(circleRef, circleData);

    // Fetch courses asynchronously using courseService
    const coursesPromise = getCourses(circleRef);

    // Wait for both promises to resolve
    const [members, courses] = await Promise.all([
      membersPromise,
      coursesPromise,
    ]);

    return { ...circleData, members, courses };
  },

  async getAllUserCircle(userId) {
    const circlesRef = collection(db, "Circles");
    const circlesSnapshot = await getDocs(circlesRef);

    const circles = [];
    for (const circleDoc of circlesSnapshot.docs) {
      const circleData = circleDoc.data();
      const membersRef = collection(circleDoc.ref, "Members");
      const memberDocRef = doc(membersRef, userId);
      const memberSnapshot = await getDoc(memberDocRef);

      if (memberSnapshot.exists()) {
        circles.push({
          id: circleDoc.id,
          circleName: circleData.circleName,
          description: circleData.description,
        });
      }
    }
    return circles;
  },
};

async function getMembers(circleRef) {
  const membersCollectionRef = collection(circleRef, "Members");
  const membersSnapshot = await getDocs(membersCollectionRef);
  const members = [];

  for (const memberDoc of membersSnapshot.docs) {
    const memberData = memberDoc.data();
    const userRef = memberData.userId;
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      members.push({
        memberId: userDoc.id,
        name: userData.name,
        role: userData.role,
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
    const courseRef = doc(db, "Courses", courseDoc.id);
    const courseSnapshot = await getDoc(courseRef);

    if (courseSnapshot.exists()) {
      const courseData = courseSnapshot.data();

      courses.push({
        id: courseDoc.id,
        name: courseData.name,
        description: courseData.description,
        onContentLoading: courseData.onContentLoading,
        published: courseData.published,
      });
    }
  }

  return courses;
}
