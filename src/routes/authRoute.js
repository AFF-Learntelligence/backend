import { register, login } from "../controller/authController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerAuthRoutes(server) {
  server.route([
    {
      path: "/api/auth/register",
      method: "POST",
      handler: register,
      options: {
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/api/auth/login",
      handler: login,
      options: {
        auth: false,
      },
    },
  ]);
}
