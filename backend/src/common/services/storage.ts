import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StorageProvider {
  /**
   * Uploads a file to a specific destination folder.
   * @param file The file object from Multer.
   * @param folder The target subdirectory (e.g. property-slug).
   * @returns The public URL of the uploaded asset.
   */
  uploadFile(file: Express.Multer.File, folder: string): Promise<string>;

  /**
   * Deletes a file given its public URL.
   * @param fileUrl The public URL of the asset to delete.
   */
  deleteFile(fileUrl: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor(baseDir = "uploads", baseUrl = "/uploads") {
    this.baseDir = path.resolve(baseDir);
    this.baseUrl = baseUrl;
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    // Sanitize folder name
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9\-_]/g, "");
    const targetDir = path.join(this.baseDir, sanitizedFolder);

    // Ensure the folder exists
    await fs.mkdir(targetDir, { recursive: true });

    // Generate unique file name
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const targetPath = path.join(targetDir, uniqueName);

    // Save the file
    await fs.writeFile(targetPath, file.buffer);

    // Return the URL path
    return `${this.baseUrl}/${sanitizedFolder}/${uniqueName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith(this.baseUrl)) {
      return;
    }

    // Resolve the URL to local path
    const relativePath = fileUrl
      .substring(this.baseUrl.length)
      .replace(/^[/\\]+/, "");
    const localPath = path.join(this.baseDir, relativePath);

    try {
      await fs.unlink(localPath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}

// Global active storage provider. Can be swapped with S3/Cloudinary providers.
export const storageProvider: StorageProvider = new LocalStorageProvider();
