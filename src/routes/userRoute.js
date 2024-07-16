import {
  updateUserProfile,
  updateEmailPassUser,
  getUserProfile,
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
  ]);
}
