import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";
import { courseService } from "../service/courceService.js";

const auth = getAuth(firebaseApp);

export async function createCourse(request, h) {
  try {
    const { uid } = request.auth;

    const user = await userService.getUserProfile(uid);

    if (user == null) {
      return h
        .response({
          status: 404,
          message: "User not found",
        })
        .code(404);
    }

    // Check if the user's role is "creator"
    if (user.role !== "creator") {
      return h
        .response({
          status: 403,
          message: "Unauthorized. Only creators can create a course.",
        })
        .code(403);
    }

    const { courseName, description, learnerProfile, content } =
      request.payload;

    if (!courseName || !description || !learnerProfile || !content) {
      return h
        .response({
          status: 400,
          message: "Missing required fields",
        })
        .code(400);
    }

    const courseData = { courseName, description, learnerProfile, content };

    const courseId = await courseService.createCourse(courseData);

    return h
      .response({
        status: 201,
        message: "Course created successfully",
        courseId: courseId,
      })
      .code(201);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while creating the course.",
      })
      .code(500);
  }
}

export async function joinCircle(request, h) {
  try {
    const { circleId } = request.params;
    const { uid } = request.auth;

    const result = await circleService.joinCircle(uid, circleId);

    if (result === null) {
      return h
        .response({
          status: 404,
          message: "Circle not found",
        })
        .code(404);
    } else if (result === "already_member") {
      return h
        .response({
          status: 200,
          message: "You are already a member of this circle",
        })
        .code(200);
    } else {
      return h
        .response({
          status: 200,
          message: "Joined circle successfully",
        })
        .code(200);
    }
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while joining the circle.",
      })
      .code(500);
  }
}
