import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import config from "../config/config.js";
import axios from "axios";

const auth = getAuth(firebaseApp);

export const courseService = {
  // Service that creates the course and initiates the content fetching
  async createCourse(userId, courseData) {
    const courseId = await saveInitialCourseData(userId, courseData);

    fetchContent(courseData)
      .then((contentData) => saveContentToDb(courseId, contentData.content))
      .catch((error) => {
        console.error("Error fetching content", error);
      });

    return courseId;
  },

  // Service that adds course reference to circle and updates course status
  async addCourseToCircle(userId, courseId, circleIds) {
    const courseData = await verifyCourseCreator(userId, courseId);

    for (const circleId of circleIds) {
      await verifyCircleExists(circleId);
      await verifyUserJoinedCircle(userId, circleId);
      await addCourseToCircleDB(courseId, circleId);
    }

    await updateCoursePublishedStatus(courseId, true);
  },

  // Service that generates chapter using ML API
  async generateChapter(chapterData) {
    const { title, length } = chapterData;

    try {
      const response = await axios.post(config.generateChapterAPI, {
        course_title: title,
        course_length: length,
      });

      return response.data;
    } catch (error) {
      console.error("Error generating chapters:", error);
      throw new Error("Failed to generate chapters.");
    }
  },

  async getCourseById(userId, courseId, circleId) {
    const courseRef = doc(db, "Courses", courseId);
    const courseSnapshot = await getDoc(courseRef);

    if (!courseSnapshot.exists()) {
      return null;
    }

    const courseData = courseSnapshot.data();

    if (courseData.published === false) {
      if (courseData.creator.id !== userId) {
        throw new Error(
          "Unauthorized. Only the course creator can access this course."
        );
      }
    } else {
      await verifyCircleExists(circleId);
      await verifyUserJoinedCircle(userId, circleId);
    }

    courseData.content = await getCourseContent(courseRef);

    const { creator, ...courseWithoutCreator } = courseData;

    return courseWithoutCreator;
  },

  async getCourseByCreator(userId) {
    const coursesRef = collection(db, "Courses");

    const creatorRef = doc(db, "Users", userId);
    const coursesQuery = query(coursesRef, where("creator", "==", creatorRef));
    const coursesSnapshot = await getDocs(coursesQuery);

    const courses = [];
    for (const courseDoc of coursesSnapshot.docs) {
      const courseData = courseDoc.data();
      courseData.id = courseDoc.id;

      const { creator, ...courseWithoutCreator } = courseData;

      courses.push(courseWithoutCreator);
    }

    return courses;
  },

  async deleteCourse(userId, courseId, circleId) {
    const courseRef = doc(db, "Courses", courseId);
    const courseSnapshot = await getDoc(courseRef);

    if (!courseSnapshot.exists()) {
      return null;
    }

    const courseData = courseSnapshot.data();

    if (
      courseData.published === false ||
      (courseData.published === true && circleId === undefined)
    ) {
      if (courseData.creator.id !== userId) {
        throw new Error(
          "Unauthorized. Only the course creator can delete this course."
        );
      }

      await deleteDoc(courseRef);

      return "course_data_deleted";
    } else if (courseData.published === true && circleId !== undefined) {
      await verifyCircleExists(circleId);
      await verifyUserJoinedCircle(userId, circleId);

      const circleRef = doc(db, "Circles", circleId);

      // Assuming Courses are stored in a subcollection in the Circle document
      const circleCourseRef = doc(circleRef, "Courses", courseId);
      await deleteDoc(circleCourseRef);

      return "course_circle_deleted";
    }
  },
};

// Save the initial course data to Firestore
async function saveInitialCourseData(userId, courseData) {
  const { name, description } = courseData;
  const coursesRef = collection(db, "Courses");
  const courseDocRef = await addDoc(coursesRef, {
    name,
    description,
    onContentLoading: true,
    published: false,
    creator: doc(db, "Users", userId),
  });
  return courseDocRef.id;
}

// Fetch content for the course from the external API
async function fetchContent(courseData) {
  const response = await axios.post(config.createCourseAPI, {
    courseName: courseData.name,
    description: courseData.description,
    content: courseData.content,
  });

  return response.data;
}

// Save the fetched content to Firestore
async function saveContentToDb(courseId, content) {
  const courseRef = doc(db, "Courses", courseId);
  const contentCollectionRef = collection(courseRef, "content");

  for (const chapter of content) {
    await addChapter(contentCollectionRef, chapter);
  }

  await updateDoc(courseRef, { onContentLoading: false });
}

// Add a chapter to the course content collection
async function addChapter(contentCollectionRef, chapter) {
  const chapterDocRef = doc(contentCollectionRef, `chapter${chapter.chapter}`);
  await setDoc(chapterDocRef, {
    chapter: chapter.chapter,
    title: chapter.title,
    text: chapter.text,
  });

  await addQuizzes(chapterDocRef, chapter.quiz);
}

// Add quizzes to a chapter
async function addQuizzes(chapterDocRef, quizzes) {
  const quizCollectionRef = collection(chapterDocRef, "quiz");
  for (const quiz of quizzes) {
    const quizDocRef = doc(quizCollectionRef);
    await setDoc(quizDocRef, {
      question: quiz.question,
      key: quiz.key,
    });

    await addChoices(quizDocRef, quiz.choices);
  }
}

// Add choices to a quiz
async function addChoices(quizDocRef, choices) {
  const choicesCollectionRef = collection(quizDocRef, "choices");
  for (const choice of choices) {
    const choiceDocRef = doc(choicesCollectionRef, choice.letter);
    await setDoc(choiceDocRef, {
      letter: choice.letter,
      answer: choice.answer,
    });
  }
}

// Retrieve the content of the course
async function getCourseContent(courseDocRef) {
  const contentCollectionRef = collection(courseDocRef, "content");
  const contentSnapshots = await getDocs(contentCollectionRef);

  const content = [];
  for (const chapterSnapshot of contentSnapshots.docs) {
    const chapterData = await getChapterContent(chapterSnapshot.ref);
    content.push(chapterData);
  }

  return content;
}

// Retrieve the content of a chapter
async function getChapterContent(chapterDocRef) {
  const chapterSnapshot = await getDoc(chapterDocRef);
  const chapterData = chapterSnapshot.data();

  // Retrieve quizzes for the chapter
  const quizCollectionRef = collection(chapterDocRef, "quiz");
  const quizSnapshots = await getDocs(quizCollectionRef);
  chapterData.quiz = [];

  for (const quizSnapshot of quizSnapshots.docs) {
    const quizData = quizSnapshot.data();

    // Retrieve choices for the quiz
    const choicesCollectionRef = collection(quizSnapshot.ref, "choices");
    const choicesSnapshots = await getDocs(choicesCollectionRef);
    quizData.choices = choicesSnapshots.docs.map((doc) => doc.data());

    chapterData.quiz.push(quizData);
  }

  // Sort quizzes by question number
  chapterData.quiz.sort((a, b) => {
    const questionNumberA = parseInt(
      a.question.match(/Question (\d+):/)[1],
      10
    );
    const questionNumberB = parseInt(
      b.question.match(/Question (\d+):/)[1],
      10
    );
    return questionNumberA - questionNumberB;
  });

  return chapterData;
}

// Verify if the user is the creator of the course
async function verifyCourseCreator(userId, courseId) {
  const courseRef = doc(db, "Courses", courseId);
  const courseSnapshot = await getDoc(courseRef);

  if (!courseSnapshot.exists()) {
    throw new Error(`Course not found: ${courseId}`);
  }

  const courseData = courseSnapshot.data();
  const courseCreatorRef = courseData.creator;

  if (courseCreatorRef.id !== userId) {
    throw new Error("Unauthorized.");
  }

  return courseData;
}

// Verify if the circle exists
async function verifyCircleExists(circleId) {
  const circleRef = doc(db, "Circles", circleId);
  const circleSnapshot = await getDoc(circleRef);

  if (!circleSnapshot.exists()) {
    throw new Error(`Circle not found: ${circleId}`);
  }
}

// Verify if the user has joined the circle
async function verifyUserJoinedCircle(userId, circleId) {
  const circleMembersRef = collection(db, "Circles", circleId, "Members");
  const userRef = doc(db, "Users", userId);
  const membersQuery = query(circleMembersRef, where("userId", "==", userRef));
  const membersSnapshot = await getDocs(membersQuery);

  if (membersSnapshot.empty) {
    throw new Error(`Unauthorized. You have not joined this circle`);
  }
}

// Add course to the circle in Firestore
async function addCourseToCircleDB(courseId, circleId) {
  const circleRef = doc(db, "Circles", circleId);
  const coursesRef = collection(circleRef, "Courses");
  const courseDocRef = doc(coursesRef, courseId);

  const courseInCircleSnapshot = await getDoc(courseDocRef);

  // Check if course already added to the circle
  if (courseInCircleSnapshot.exists()) {
    console.log(`Course ${courseId} is already added to Circle ${circleId}`);
    return;
  }

  await setDoc(doc(coursesRef, courseId), {
    courseId: doc(db, "Courses", courseId),
  });
}

// Update the published status of the course
async function updateCoursePublishedStatus(courseId, status) {
  const courseRef = doc(db, "Courses", courseId);
  await updateDoc(courseRef, { published: status });
}
