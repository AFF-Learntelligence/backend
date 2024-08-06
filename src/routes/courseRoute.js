import {
  createCourse,
  getCourseById,
  generateChapter,
  getCourseByCreator,
  publishCourse,
  uploadPdf,
} from "../controller/courseController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerCircleRoutes(server) {
  server.route([
    {
      path: "/api/courses/create",
      method: "POST",
      handler: createCourse,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/courses/{courseId}",
      method: "GET",
      handler: getCourseById,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/courses/creator",
      method: "GET",
      handler: getCourseByCreator,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/courses/publish",
      method: "POST",
      handler: publishCourse,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/chapters/generate",
      method: "POST",
      handler: generateChapter,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/courses/pdf",
      method: "POST",
      handler: uploadPdf,
      config: {
        payload: {
          maxBytes: 10 * 1024 * 1024, // 10MB
          output: "stream",
          parse: true,
          multipart: true,
          allow: "multipart/form-data",
        },
      },
    },
  ]);
}
