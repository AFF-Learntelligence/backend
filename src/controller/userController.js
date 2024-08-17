import { getAuth } from "firebase/auth";
import { firebaseApp } from "../config/firebaseConfig.js";
import { userService } from "../service/userService.js";

const auth = getAuth(firebaseApp);

export async function updateUserProfile(request, h) {
  try {
    const { name } = request.payload;

    const { uid } = request.auth;

    const updateData = {};
    if (name) updateData.name = name;

    await userService.updateUserProfile(uid, updateData);

    return h
      .response({
        status: 200,
        message: "User profile updated successfully.",
      })
      .code(200);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message:
          "An error occurred while updating your profile. Please try again later.",
      })
      .code(500);
  }
}

export async function updateEmailPassUser(request, h) {
  try {
    const { email, password } = request.payload;

    auth.updateCurrentUser;

    const user = auth.currentUser;

    if (email) {
      await userService.updateEmail(user, email);

      const { uid } = request.auth;
      const updateData = {
        email: email,
      };
      await userService.updateUserProfile(uid, updateData);

      return h
        .response({
          status: 200,
          message: "Email updated successfully.",
        })
        .code(200);
    }

    if (password) {
      await userService.updatePassword(user, password);
      return h
        .response({
          status: 200,
          message: "Password updated successfully.",
        })
        .code(200);
    }
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message:
          "An error occurred while updating your email or password. Please try again later.",
      })
      .code(500);
  }
}

export async function getUserProfile(request, h) {
  try {
    const { uid } = request.auth;

    const userData = await userService.getUserProfile(uid);

    if (userData === null) {
      return h
        .response({
          status: 404,
          message: "User profile does not exist",
        })
        .code(404);
    } else {
      return h
        .response({
          status: 200,
          message: "User profile retrieved successfully",
          data: userData,
        })
        .code(200);
    }
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while retrieving user profile.",
      })
      .code(500);
  }
}

export async function getUserCourses(request, h) {
  try {
    const { uid } = request.auth;

    const courses = await userService.getUserCourses(uid);

    if (courses.length === 0) {
      return h
        .response({
          status: 200,
          message: "No courses found. Initialized courses collection.",
          courses: [],
        })
        .code(200);
    } else {
      return h
        .response({
          status: 200,
          courses: courses,
        })
        .code(200);
    }
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while fetching courses.",
      })
      .code(500);
  }
}

export async function requestRoleChange(request, h) {
  try {
    const { uid } = request.auth;
    const { message } = request.payload;

    const data = {
      userId: uid,
      message,
      requestedRole: "creator",
      status: "pending",
      requestDate: new Date(),
    };

    await userService.requestRole(data);
    return h
      .response({
        status: 200,
        message: "Role change request submitted.",
      })
      .code(200);
  } catch (error) {
    console.log(error.message);
    return h
      .response({
        status: 500,
        message: "An error occurred while sending change role request.",
      })
      .code(500);
  }
}
