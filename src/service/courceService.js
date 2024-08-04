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

  // Service that add course reference to circle and update course status
  async addCourseToCircle(userId, courseId, circleIds) {
    // Check if user is creator of course
    const courseRef = doc(db, "Courses", courseId);
    const courseSnapshot = await getDoc(courseRef);

    if (!courseSnapshot.exists()) {
      throw new Error(`Course not found: ${courseId}`);
    }

    const courseData = courseSnapshot.data();
    const courseCreatorRef = courseData.creator;
    if (courseCreatorRef.id !== userId) {
      throw new Error(
        "Unauthorized. Only the course creator can publish the course to circles."
      );
    }

    for (const circleId of circleIds) {
      const circleRef = doc(db, "Circles", circleId);
      const circleSnapshot = await getDoc(circleRef);

      if (!circleSnapshot.exists()) {
        throw new Error(`Circle not found: ${circleId}`);
      }

      const coursesRef = collection(circleRef, "Courses");
      await setDoc(doc(coursesRef, courseId), {
        courseId: doc(db, "Courses", courseId),
      });

      // Update the 'published' attribute of the course to true
      const courseRef = doc(db, "Courses", courseId);
      await updateDoc(courseRef, { published: true });
    }
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

  async getCourseById(courseId) {
    const courseRef = doc(db, "Courses", courseId);
    const courseSnapshot = await getDoc(courseRef);

    if (!courseSnapshot.exists()) {
      return null;
    }

    const courseData = courseSnapshot.data();

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
};

// This function saves the initial course data to Firestore
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

async function fetchContent(courseData) {
  const response = await axios.post(config.createCourseAPI, {
    courseName: courseData.name,
    description: courseData.description,
    content: courseData.content,
  });

  return response.data;
}

async function saveContentToDb(courseId, content) {
  const courseRef = doc(db, "Courses", courseId);
  const contentCollectionRef = collection(courseRef, "content");

  for (const chapter of content) {
    await addChapter(contentCollectionRef, chapter);
  }

  await updateDoc(courseRef, { onContentLoading: false });
}

async function addChapter(contentCollectionRef, chapter) {
  const chapterDocRef = doc(contentCollectionRef, `chapter${chapter.chapter}`);
  await setDoc(chapterDocRef, {
    chapter: chapter.chapter,
    title: chapter.title,
    text: chapter.text,
  });

  await addQuizzes(chapterDocRef, chapter.quiz);
}

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
