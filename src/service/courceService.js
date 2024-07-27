import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { db } from "../config/firebaseConfig.js";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";
import config from "../config/config.js";
import axios from "axios";

const auth = getAuth(firebaseApp);

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
      letter: letter,
      answer: answer,
    });
  }
}

export const courseService = {
  async createCourse(courseData) {
    const { name, description, content } = courseData;
    const coursesRef = collection(db, "Courses");
    const courseDocRef = await addDoc(coursesRef, {
      name,
      description,
    });

    const contentCollectionRef = collection(courseDocRef, "content");
    for (const chapter of content) {
      await addChapter(contentCollectionRef, chapter);
    }
    return courseDocRef.id;
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
