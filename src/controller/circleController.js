import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { circleService } from "../service/circleService.js";

const auth = getAuth(firebaseApp);

export async function createCircle(request, h) {
  try {
    const { uid } = request.auth;

    const { circleName, description } = request.payload;
    const circleData = { circleName, description };

    return h
      .response({
        status: 201,
        message: "Circle created successfully",
        invitationLink: await circleService.createCircle(uid, circleData),
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
    const { circleId } = request.params;
    const data = await circleService.getCircleDetails(circleId);

    if (data === null) {
      return h
        .response({
          status: 404,
          message: "Circle not found",
        })
        .code(404);
    }

    return h
      .response({
        status: 200,
        message: "Circle details retrieved successfully.",
        data: {
          ...data.circleData,
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
