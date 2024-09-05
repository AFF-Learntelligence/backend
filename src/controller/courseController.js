import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";
import { courseService } from "../service/courceService.js";
import { fileService } from "../service/fileService.js";

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

    const { name, description, content, circleId, pdfUrls, youtubeUrls, lang } =
      request.payload;

    if (!name || !description || !content) {
      return h
        .response({ status: 400, message: "Missing required fields!" })
        .code(400);
    }

    const courseData = {
      name,
      description,
      content,
      pdfUrls,
      youtubeUrls,
      lang,
    };

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

// Handler for getting a course by ID in Landing Page
export async function getCourseLandingPage(request, h) {
  try {
    const { courseId } = request.params;

    // List of course IDs that don't require authentication
    const openAccessCourses = [
      "7YVcqeCGv4zPxPhIcKtn",
      "L7oGR8cOj4ERuuoac7cj",
      "VFTVJ4Bekgm8HUNGkl2h",
      "8L5xAqTyMsLz6GDdu4Ka",
      "EfJZvYbUUwLVSR1P7kgK",
    ];

    // Check if the courseId is in the list of open access courses
    if (openAccessCourses.includes(courseId)) {
      const courseData = await courseService.getCourseLandingPage(courseId);

      if (!courseData) {
        return h
          .response({
            status: 404,
            message: "Course not found",
          })
          .code(404);
      }

      return h
        .response({
          status: 200,
          message: "Course data retrieved successfully.",
          data: courseData,
        })
        .code(200);
    } else {
      // If courseId is not in the open access list, return a 403 Forbidden error
      return h
        .response({
          status: 403,
          message: "Unauthorized access.",
        })
        .code(403);
    }
  } catch (error) {
    console.error(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while retrieving the course.",
      })
      .code(500);
  }
}

// Handler for getting a course by ID
export async function getCourseCreatorLandingPage(request, h) {
  try {
    const { uid } = request.auth;
    const { courseId } = request.params;

    const courseData = await courseService.getCourseByIdLandingPage(
      uid,
      courseId
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

// Handler for updating a course by ID
export async function updateCourseById(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

    const { name, description, content } = request.payload;
    const { courseId } = request.params;
    const { circleId } = request.query;

    let updateData = {}; // Initialize updateData as an empty object

    if (name) updateData.name = name;
    if (description) updateData.description = description;

    let status;

    if (Object.keys(updateData).length > 0) {
      // Check if there's anything to update
      status = await courseService.updateCourseData(
        uid,
        courseId,
        circleId,
        updateData
      );
    }

    if (content) {
      status = await courseService.updateCourseContent(
        uid,
        courseId,
        circleId,
        content
      );
    }

    if (status === null) {
      return h
        .response({
          status: 404,
          message: "Course not found",
        })
        .code(404);
    }

    return h.response({
      status: 200,
      message: "Course data updated successfully.",
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

export async function deleteCourse(request, h) {
  try {
    const { uid } = request.auth;
    const { courseId } = request.params;
    const { circleId } = request.query;

    const courseData = await courseService.deleteCourse(
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

    if (courseData === "course_data_deleted") {
      return h.response({
        status: 200,
        message: "Course data deleted successfully.",
      });
    } else if (courseData === "course_circle_deleted") {
      return h.response({
        status: 200,
        message: "Course deleted from circle successfully.",
      });
    }
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

    const { title, length, lang } = request.payload;

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

    const chapterData = { title, length, lang };
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

export async function uploadPdf(request, h) {
  try {
    const { uid } = request.auth;
    await checkUserAndRole(uid, "creator");

    const { file } = request.payload;

    if (!file) {
      return h.response({ status: 400, message: "No file uploaded" }).code(400);
    }

    const fileName = file.hapi.filename;
    const url = await fileService.uploadPdf(file, fileName);

    return h
      .response({
        status: 200,
        message: "File uploaded successfully",
        url,
      })
      .code(200);
  } catch (error) {
    console.error("Error uploading file:", error);
    return h
      .response({
        status: 500,
        message: "An error occurred while uploading the file.",
      })
      .code(500);
  }
}
