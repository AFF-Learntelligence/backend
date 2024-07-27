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
} from "firebase/firestore";
import config from "../config/config.js";
import axios from "axios";

const auth = getAuth(firebaseApp);

export const courseService = {
  async createCourse(userId, courseData) {
    const courseId = await saveInitialCourseData(userId, courseData);

    fetchContent(courseData)
      .then((contentData) => saveContentToDb(courseId, contentData.content))
      .catch((error) => {
        console.error("Error fetching content", error);
      });
  },

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

    // Retrieve creator's name
    const creatorRef = courseData.creator;
    const creatorSnapshot = await getDoc(creatorRef);

    if (creatorSnapshot.exists()) {
      const creatorData = creatorSnapshot.data();
      courseData.creator = creatorData.name;
    } else {
      courseData.creator = "Unknown";
    }

    courseData.content = await getCourseContent(courseRef);

    return courseData;
  },
};

async function saveInitialCourseData(userId, courseData) {
  const { name, description } = courseData;
  const coursesRef = collection(db, "Courses");
  const courseDocRef = await addDoc(coursesRef, {
    name,
    description,
    onContentLoading: true,
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
