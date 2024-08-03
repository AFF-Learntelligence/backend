import {
  createCircle,
  getCircleDetails,
  joinCircle,
  getAllUserCircle,
} from "../controller/circleController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerCircleRoutes(server) {
  server.route([
    {
      path: "/api/circles/create",
      method: "POST",
      handler: createCircle,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/invite/{circleId}",
      method: "POST",
      handler: joinCircle,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/circles/{circleId}",
      method: "GET",
      handler: getCircleDetails,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
    {
      path: "/api/circles",
      method: "GET",
      handler: getAllUserCircle,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
  ]);
}
