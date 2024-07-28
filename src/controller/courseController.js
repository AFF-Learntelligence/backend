import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";
import { courseService } from "../service/courceService.js";

const auth = getAuth(firebaseApp);

export async function createCourse(request, h) {
  try {
    const { uid } = request.auth;

    const user = await userService.getUserProfile(uid);

    if (!user) {
      return h.response({ status: 404, message: "User not found" }).code(404);
    }

    if (user.role !== "creator") {
      return h
        .response({
          status: 403,
          message: "Unauthorized. Only creators can create a course.",
        })
        .code(403);
    }

    const { name, description, content } = request.payload;

    if (!name || !description || !content) {
      return h
        .response({ status: 400, message: "Missing required fields!" })
        .code(400);
    }

    const courseData = { name, description, content };

    const courseId = await courseService.createCourse({
      uid,
      courseData,
    });

    return h
      .response({
        status: 201,
        message:
          "Course created successfully. Please wait for our machine learning to generate your content.",
        courseId,
      })
      .code(201);
  } catch (error) {
    console.error(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while creating the course.",
      })
      .code(500);
  }
}

export async function getCourseById(request, h) {
  try {
    const { courseId } = request.params;

    const courseData = await courseService.getCourseById(courseId);

    if (courseData === null) {
      return h
        .response({
          status: 404,
          message: "Course not found",
        })
        .code(404);
    }

    return h.response({
      status: 200,
      message: "Course data retrieved successfully.",
      data: courseData,
    });
  } catch (error) {
    console.error(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while fetching the course.",
      })
      .code(500);
  }
}

export async function getCourseByCreator(request, h) {
  try {
    const { uid } = request.auth;

    const user = await userService.getUserProfile(uid);

    if (!user) {
      return h.response({ status: 404, message: "User not found" }).code(404);
    }

    if (user.role !== "creator") {
      return h
        .response({
          status: 403,
          message:
            "Unauthorized. Only creators can retrieve creator's courses.",
        })
        .code(403);
    }

    const courses = await courseService.getCourseByCreator(uid);

    if (courses.length === 0) {
      return h
        .response({
          status: 200,
          message: "No courses found for this creator",
        })
        .code(200);
    }

    return h.response({
      status: 200,
      message: "Courses retrieved successfully.",
      data: courses,
    });
  } catch (error) {
    console.error(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while fetching the courses.",
      })
      .code(500);
  }
}

export async function generateChapter(request, h) {
  try {
    const { uid } = request.auth;

    const user = await userService.getUserProfile(uid);

    if (!user) {
      return h.response({ status: 404, message: "User not found" }).code(404);
    }

    if (user.role !== "creator") {
      return h
        .response({
          status: 403,
          message: "Unauthorized. Only creators can generate chapter.",
        })
        .code(403);
    }

    const { title, length } = request.payload;

    if (!title || !length) {
      return h
        .response({ status: 400, message: "Missing required fields!" })
        .code(400);
    }

    if (isNaN(length)) {
      return h
        .response({
          status: 400,
          message: "Course Length must be a number!",
        })
        .code(400);
    }

    const chapterData = { title, length };
    const generatedChapters = await courseService.generateChapter(chapterData);

    return h
      .response({
        status: 200,
        message: "Chapters generated successfully.",
        data: generatedChapters,
      })
      .code(200);
  } catch (error) {
    console.error(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while generating chapter.",
      })
      .code(500);
  }
}
