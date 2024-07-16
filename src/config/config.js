import dotenv from "dotenv";
dotenv.config();

const {
  PORT,
  HOST,
  API_KEY,
  AUTH_DOMAIN,
  PROJECT_ID,
  STORAGE_BUCKET,
  MESSAGING_SENDER_ID,
  APP_ID,
  MEASUREMENT_ID,
  TYPE,
  PRIVATE_KEY_ID,
  PRIVATE_KEY,
  CLIENT_EMAIL,
  CLIENT_ID,
  AUTH_URI,
  TOKEN_URI,
  AUTH_PROVIDER_X509_CERT_URL,
  CLIENT_X509_CERT_URL,
  UNIVERSE_DOMAIN,
  APP_URL,
} = process.env;

const config = {
  port: PORT,
  host: HOST,
  appUrl: APP_URL,
  firebaseConfig: {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID,
    measurementId: MEASUREMENT_ID,
  },
  firebaseAdminConfig: {
    type: TYPE,
    project_id: PROJECT_ID,
    private_key_id: PRIVATE_KEY_ID,
    private_key: PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: CLIENT_EMAIL,
    client_id: CLIENT_ID,
    auth_uri: AUTH_URI,
    token_uri: TOKEN_URI,
    auth_provider_x509_cert_url: AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: CLIENT_X509_CERT_URL,
    universe_domain: UNIVERSE_DOMAIN,
  },
};

export default config;
