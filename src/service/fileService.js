import { Storage } from "@google-cloud/storage";
import config from "../config/config.js";

const key = JSON.parse(config.gcpSaKey);

const storage = new Storage({
  projectId: key.project_id,
  credentials: {
    client_email: key.client_email,
    private_key: key.private_key,
  },
});

const bucketName = "aff-learntelligence-pdfbucket";
const bucket = storage.bucket(bucketName);

export const fileService = {
  async uploadPdf(file, fileName) {
    try {
      // Define the destination path within the bucket
      const storagePath = `${fileName}`;

      // Create a writable stream to GCS
      const writeStream = bucket.file(storagePath).createWriteStream({
        resumable: false,
        gzip: true,
        metadata: {
          contentType: file.hapi.headers["content-type"], // Set the content type
          cacheControl: "public, max-age=31536000", // Set cache control
        },
      });

      // Pipe the file stream to the writable stream
      file.pipe(writeStream);

      // Wait for the stream to finish
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Generate a public URL for accessing the file
      const [url] = await bucket.file(storagePath).getSignedUrl({
        action: "read",
        expires: "03-09-2491", // Change to a more appropriate expiration date
      });

      return url;
    } catch (error) {
      console.error("Error uploading file to GCS:", error);
      throw new Error("Failed to upload file to GCS.");
    }
  },
};
