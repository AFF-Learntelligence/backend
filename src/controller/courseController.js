import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";
import { courseService } from "../service/courceService.js";

const auth = getAuth(firebaseApp);

// export async function createCourse(request, h) {
//   try {
//     const { uid } = request.auth;

//     const user = await userService.getUserProfile(uid);

//     if (user == null) {
//       return h
//         .response({
//           status: 404,
//           message: "User not found",
//         })
//         .code(404);
//     }

//     // Check if the user's role is "creator"
//     if (user.role !== "creator") {
//       return h
//         .response({
//           status: 403,
//           message: "Unauthorized. Only creators can create a course.",
//         })
//         .code(403);
//     }

//     const { name, description, content } = request.payload;

//     if (!name || !description || !content) {
//       return h
//         .response({
//           status: 400,
//           message: "Missing required fields",
//         })
//         .code(400);
//     }

//     const courseData = { name, description, content };

//     const courseId = await courseService.createCourse(courseData);

//     return h
//       .response({
//         status: 201,
//         message: "Course created successfully",
//         courseId: courseId,
//       })
//       .code(201);
//   } catch (error) {
//     console.log(error.message);
//     return h
//       .response({
//         status: 500,
//         message: "An error occurred while creating the course.",
//       })
//       .code(500);
//   }
// }

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

    const courseId = await courseService.createCourse({
      name,
      description,
      content,
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
