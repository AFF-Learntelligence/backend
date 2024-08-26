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
import https from "https";

const auth = getAuth(firebaseApp);

// Create an Axios instance with updated timeout and response size settings
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: true }),
  timeout: 1200000, // 1 hour (3600 seconds)
  maxContentLength: Infinity, // Allow large content length
  maxRedirects: 0, // Prevent automatic redirects if large responses cause issues
});

export const courseService = {
  // Service that creates the course and initiates the content fetching
  async createCourse(userId, courseData) {
    const courseId = await saveInitialCourseData(userId, courseData);

    console.log(`Course ${courseId} created. Starting content fetch...`);

    // Use a separate function to handle the long-running process
    handleContentFetch(courseId, courseData).catch((error) => {
      console.error(`Error in content fetch for course ${courseId}:`, error);
      // Update the course status to error
      updateCourseStatus(courseId, "error").catch(console.error);
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

  async updateCourseData(userId, courseId, circleId, updateData) {
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
          "Unauthorized. Only the course creator can access this course."
        );
      }
    } else if (courseData.published === true && circleId !== undefined) {
      await verifyCircleExists(circleId);
      await verifyUserJoinedCircle(userId, circleId);
    }

    // update course data with updateData here
    await updateDoc(courseRef, updateData);

    return true;
  },

  async updateCourseContent(userId, courseId, circleId, content) {
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
          "Unauthorized. Only the course creator can access this course."
        );
      }
    } else if (courseData.published === true && circleId !== undefined) {
      await verifyCircleExists(circleId);
      await verifyUserJoinedCircle(userId, circleId);
    }

    const contentCollectionRef = collection(courseRef, "content");

    for (const chapter of content) {
      await addOrUpdateChapter(contentCollectionRef, chapter);
    }

    return true;
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

      await deleteExistingContent(courseRef);
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

async function handleContentFetch(courseId, courseData) {
  try {
    console.log(`Fetching content for course ${courseId}...`);
    const contentData = await fetchContent(courseData);
    console.log(`Content fetched for course ${courseId}. Saving to DB...`);
    await saveContentToDb(courseId, contentData.content);
    console.log(`Content saved for course ${courseId}.`);
    // Update the course status to complete
    await updateCourseStatus(courseId, "complete");
  } catch (error) {
    console.error(`Error processing content for course ${courseId}:`, error);
    throw error;
  }
}

async function updateCourseStatus(courseId, status) {
  const courseRef = doc(db, "Courses", courseId);
  await updateDoc(courseRef, {
    onContentLoading: status === "complete" ? false : true,
    status: status,
  });
}

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
  try {
    console.log("Sending request to ML API...");
    const response = await axiosInstance.post(config.createCourseAPI, {
      courseName: courseData.name,
      description: courseData.description,
      content: courseData.content,
      pdf_urls: courseData.pdfUrls,
      youtube_urls: courseData.youtubeUrls,
      lang: courseData.lang,
    });
    console.log("Received response from ML API");
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.error("Request to ML API timed out");
    } else {
      console.error("Error from ML API:", error.message);
    }
    throw error;
  }
}

// Save the fetched content to Firestore
async function saveContentToDb(courseId, content) {
  const courseRef = doc(db, "Courses", courseId);
  const contentCollectionRef = collection(courseRef, "content");

  console.log(`Saving ${content.length} chapters for course ${courseId}`);

  for (let i = 0; i < content.length; i++) {
    console.log(`Saving chapter ${i + 1} of ${content.length}`);
    await addOrUpdateChapter(contentCollectionRef, content[i]);
  }

  console.log(
    `All chapters saved for course ${courseId}. Updating course status...`
  );
  await updateDoc(courseRef, { onContentLoading: false });
  console.log(`Course ${courseId} status updated to complete`);
}

// Add a chapter to the course content collection
async function addOrUpdateChapter(contentCollectionRef, chapter) {
  const chapterDocRef = doc(contentCollectionRef, `chapter${chapter.chapter}`);
  const chapterSnapshot = await getDoc(chapterDocRef);

  if (chapterSnapshot.exists()) {
    // If the chapter exists, update it
    await updateDoc(chapterDocRef, {
      title: chapter.title,
      text: chapter.text,
    });

    // Delete existing quizzes and choices before adding new ones
    await deleteExistingQuizzes(chapterDocRef);
  } else {
    // If the chapter doesn't exist, create it
    await setDoc(chapterDocRef, {
      chapter: chapter.chapter,
      title: chapter.title,
      text: chapter.text,
    });
  }

  await addQuizzes(chapterDocRef, chapter.quiz);
}

async function deleteExistingContent(courseRef) {
  const contentCollectionRef = collection(courseRef, "content");
  const contentSnapshots = await getDocs(contentCollectionRef);

  for (const chapterDoc of contentSnapshots.docs) {
    const chapterRef = chapterDoc.ref;

    // Delete all quizzes and choices for the chapter
    await deleteExistingQuizzes(chapterRef);

    // Delete the chapter itself
    await deleteDoc(chapterRef);
  }
}

// Delete existing quizzes and choices in a chapter
async function deleteExistingQuizzes(chapterDocRef) {
  const quizCollectionRef = collection(chapterDocRef, "quiz");
  const quizSnapshot = await getDocs(quizCollectionRef);

  for (const quizDoc of quizSnapshot.docs) {
    const quizDocRef = quizDoc.ref;
    // Delete choices associated with this quiz
    await deleteExistingChoices(quizDocRef);
    // Delete the quiz itself
    await deleteDoc(quizDocRef);
  }
}

// Delete existing choices in a quiz
async function deleteExistingChoices(quizDocRef) {
  const choicesCollectionRef = collection(quizDocRef, "choices");
  const choicesSnapshot = await getDocs(choicesCollectionRef);

  for (const choiceDoc of choicesSnapshot.docs) {
    await deleteDoc(choiceDoc.ref);
  }
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
