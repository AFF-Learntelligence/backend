import Hapi from "@hapi/hapi";
import config from "./config/config.js";
import registerAuthRoutes from "./routes/authRoute.js";
import registerUserRoutes from "./routes/userRoute.js";
import registerCircleRoutes from "./routes/circleRoute.js";
import registerCourseRoutes from "./routes/courseRoute.js";

(async () => {
  const server = Hapi.server({
    port: config.port,
    host: config.host,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  registerAuthRoutes(server);
  registerUserRoutes(server);
  registerCircleRoutes(server);
  registerCourseRoutes(server);

  try {
    await server.start();

    console.log(`Server started at: ${server.info.uri}`);
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();
