import { createCircle } from "../controller/circleController.js";
import { validateFirebaseIdToken } from "../middleware/authMiddleware.js";

export default function registerCircleRoutes(server) {
  server.route([
    {
      path: "/api/circle/create",
      method: "POST",
      handler: createCircle,
      options: {
        pre: [{ method: validateFirebaseIdToken }],
      },
    },
  ]);
}
