import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { circleService } from "../service/circleService.js";
import { userService } from "../service/userService.js";

const auth = getAuth(firebaseApp);

export async function createCircle(request, h) {
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
          message: "Unauthorized. Only creators can create a circle.",
        })
        .code(403);
    }

    const { circleName, description } = request.payload;
    if (!circleName || !description) {
      return h
        .response({
          status: 400,
          message: "Missing required fields",
        })
        .code(400);
    }

    const circleData = { circleName, description };

    const { circleId, invitationLink } = await circleService.createCircle(
      uid,
      circleData
    );

    return h
      .response({
        status: 201,
        message: "Circle created successfully",
        circleId: circleId,
        invitationLink: invitationLink,
      })
      .code(201);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while creating the circle.",
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

export async function getCircleDetails(request, h) {
  try {
    const { uid } = request.auth;
    const { circleId } = request.params;
    const data = await circleService.getCircleDetails(circleId, uid);

    if (data === null) {
      return h
        .response({
          status: 404,
          message: "Circle not found",
        })
        .code(404);
    }

    if (data === "not_a_member") {
      return h
        .response({
          status: 403,
          message: "User is not a member of the circle.",
        })
        .code(403);
    }

    return h
      .response({
        status: 200,
        message: "Circle details retrieved successfully.",
        data: {
          circleName: data.circleName,
          description: data.description,
          invitationLink: data.invitationLink,
          members: data.members,
          courses: data.courses,
        },
      })
      .code(200);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while retrieving circle details.",
      })
      .code(500);
  }
}

export async function getAllUserCircle(request, h) {
  try {
    const { uid } = request.auth;

    const circles = await circleService.getAllUserCircle(uid);

    if (circles.length === 0) {
      return h.response({
        status: 200,
        message: "User is not a member of any circles.",
        data: [],
      });
    }

    return h.response({
      status: 200,
      message: "User's circles retrieved successfully.",
      data: circles,
    });
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while retrieving user's circle.",
      })
      .code(500);
  }
}

export async function getUnpublishedCircles(request, h) {
  try {
    const { uid } = request.auth;
    const { courseId } = request.params;
    const { courseName, courseDescription, unpublishedCircles } =
      await circleService.getUnpublishedCircles(uid, courseId);

    return h
      .response({
        status: 200,
        message: "Circles retrieved successfully.",
        courseName,
        courseDescription,
        unpublishedCircles,
      })
      .code(200);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while retrieving circles.",
      })
      .code(500);
  }
}
