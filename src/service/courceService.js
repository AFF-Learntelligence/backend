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
      correctAnswer: quiz.correctAnswer,
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
  async createCourse(courseData) {
    const { courseName, description, learnerProfile, content } = courseData;
    const coursesRef = collection(db, "Courses");
    const courseDocRef = await addDoc(coursesRef, {
      courseName,
      description,
      learnerProfile,
    });

    const contentCollectionRef = collection(courseDocRef, "content");
    for (const chapter of content) {
      await addChapter(contentCollectionRef, chapter);
    }
    return courseDocRef.id;
  },
};
