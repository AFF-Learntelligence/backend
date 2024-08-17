import {
  updateUserProfile,
  updateEmailPassUser,
  getUserProfile,
  getUserCourses,
  requestRoleChange,
} from "../controller/userController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerUserRoutes(server) {
  server.route([
    {
      path: "/api/user",
      method: "PUT",
      handler: updateUserProfile,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/user-auth",
      method: "PUT",
      handler: updateEmailPassUser,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/user",
      method: "GET",
      handler: getUserProfile,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/user/courses",
      method: "GET",
      handler: getUserCourses,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/user/request-role",
      method: "POST",
      handler: requestRoleChange,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
  ]);
}
