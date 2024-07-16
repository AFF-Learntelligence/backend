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
