import { createCourse } from "../controller/courseController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerCircleRoutes(server) {
  server.route([
    {
      path: "/api/course/create",
      method: "POST",
      handler: createCourse,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
  ]);
}
