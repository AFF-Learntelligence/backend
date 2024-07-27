import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import config from "../config/config.js";
import axios from "axios";

const auth = getAuth(firebaseApp);

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
};
