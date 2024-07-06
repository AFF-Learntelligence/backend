import admin from "firebase-admin";

const validateFirebaseIdToken = async (request, h) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return h
      .response({ message: "Missing authorization header" })
      .code(401)
      .takeover();
  }

  const tokenParts = authorization.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
    return h
      .response({ message: "Invalid authorization header format" })
      .code(401)
      .takeover();
  }

  const idToken = tokenParts[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    request.auth = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...decodedToken,
    };
    return h.continue;
  } catch (error) {
    // Handle specific error cases
    if (error.code === "auth/id-token-expired") {
      return h
        .response({
          message: "Your session has expired. Please log in again to continue.",
        })
        .code(401)
        .takeover();
    } else if (
      error.code === "auth/argument-error" ||
      error.code === "auth/invalid-token"
    ) {
      return h
        .response({ message: "Invalid ID token provided." })
        .code(401)
        .takeover();
    } else if (
      error.code === "auth/insufficient-permission" ||
      error.message.includes("permission denied")
    ) {
      return h
        .response({ message: "Missing or insufficient permissions." })
        .code(403)
        .takeover();
    }

    return h.response({ message: "Invalid ID token" }).code(401).takeover();
  }
};

export { validateFirebaseIdToken };
