import {
  createCourse,
  getCourseById,
  generateChapter,
  getCourseByCreator,
} from "../controller/courseController.js";
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
    {
      path: "/api/course/{courseId}",
      method: "GET",
      handler: getCourseById,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/course/creator",
      method: "GET",
      handler: getCourseByCreator,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/chapter/generate",
      method: "POST",
      handler: generateChapter,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
  ]);
}
