import {
  createCourse,
  getCourseById,
  generateChapter,
  getCourseByCreator,
  publishCourse,
  uploadPdf,
  deleteCourse,
  updateCourseById,
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
        payload: {
          maxBytes: 50 * 1024 * 1024, // 50MB (adjust as needed)
          timeout: false, // 1 hour (3600 seconds)
          parse: true, // Ensure the payload is parsed
          output: "data", // Can be 'stream' if needed
        },
        timeout: {
          server: false, // Disable server-side timeout
          socket: false, // 1 hour for socket timeout
        },
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
      path: "/api/courses/{courseId}",
      method: "PUT",
      handler: updateCourseById,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/courses/{courseId}",
      method: "DELETE",
      handler: deleteCourse,
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
      options: {
        pre: [{ method: validateFirebaseIdToken }],
        payload: {
          maxBytes: 10 * 1024 * 1024, // 10MB
          output: "stream",
          parse: true,
          multipart: true,
          allow: "multipart/form-data",
        },
        handler: uploadPdf,
      },
    },
  ]);
}
