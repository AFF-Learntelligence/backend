import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";
import { courseService } from "../service/courceService.js";

const auth = getAuth(firebaseApp);

// Helper function to check user existence and role
async function checkUserAndRole(uid, requiredRole) {
  const user = await userService.getUserProfile(uid);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== requiredRole) {
    throw new Error(
      "Unauthorized. Only " + requiredRole + "s can perform this action."
    );
  }

  return user;
}

// Handler for creating a course
export async function createCourse(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

    const { name, description, content, circleId } = request.payload;

    if (!name || !description || !content) {
      return h
        .response({ status: 400, message: "Missing required fields!" })
        .code(400);
    }

    const courseData = { name, description, content };

    const courseId = await courseService.createCourse(uid, courseData);

    // If circleId is provided, add the course reference to the circle
    if (circleId) {
      try {
        await courseService.addCourseToCircle(uid, courseId, [circleId]);
      } catch (error) {
        return h
          .response({
            status: 404,
            message: error.message,
          })
          .code(404);
      }
    }

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
    const statusCode = error.message.includes("Unauthorized") ? 403 : 500;
    return h
      .response({
        status: statusCode,
        message: error.message,
      })
      .code(statusCode);
  }
}

// Handler for getting a course by ID
export async function getCourseById(request, h) {
  try {
    const { uid } = request.auth;
    const { courseId } = request.params;
    const { circleId } = request.query;

    const courseData = await courseService.getCourseById(
      uid,
      courseId,
      circleId
    );

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
    const statusCode = error.message.includes("Unauthorized") ? 403 : 500;
    return h
      .response({
        status: statusCode,
        message: error.message,
      })
      .code(statusCode);
  }
}

// Handler for getting courses by creator
export async function getCourseByCreator(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

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
    const statusCode = error.message.includes("Unauthorized") ? 403 : 500;
    return h
      .response({
        status: statusCode,
        message: error.message,
      })
      .code(statusCode);
  }
}

// Handler for publishing a course to multiple circles
export async function publishCourse(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

    const { courseId, circleIds } = request.payload;

    if (
      !courseId ||
      !circleIds ||
      !Array.isArray(circleIds) ||
      circleIds.length === 0
    ) {
      return h
        .response({
          status: 400,
          message: "Missing required fields or invalid data!",
        })
        .code(400);
    }

    // Add course to multiple circles
    try {
      await courseService.addCourseToCircle(uid, courseId, circleIds);
    } catch (error) {
      const statusCode = error.message.includes("Unauthorized") ? 403 : 404;
      return h
        .response({
          status: statusCode,
          message: error.message,
        })
        .code(statusCode);
    }

    return h
      .response({
        status: 200,
        message: "Course published to circles successfully.",
      })
      .code(200);
  } catch (error) {
    console.error(error.message);
    const statusCode = error.message.includes("Unauthorized") ? 403 : 404;
    return h
      .response({
        status: statusCode,
        message: error.message,
      })
      .code(statusCode);
  }
}

// Handler for generating chapters
export async function generateChapter(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

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
