import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { env } from "@/config/env.js";

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

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;
  private keyPrefix: string;

  constructor(options: {
    region: string;
    bucket: string;
    publicBaseUrl: string;
    keyPrefix?: string;
  }) {
    this.client = new S3Client({ region: options.region });
    this.bucket = options.bucket;
    this.publicBaseUrl = stripTrailingSlash(options.publicBaseUrl);
    this.keyPrefix = stripSlashes(options.keyPrefix ?? "uploads");
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const sanitizedFolder = sanitizeFolder(folder);
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const key = [this.keyPrefix, sanitizedFolder, uniqueName]
      .filter(Boolean)
      .join("/");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || undefined,
      }),
    );

    return `${this.publicBaseUrl}/${key}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.resolveKey(fileUrl);
    if (!key) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private resolveKey(fileUrl: string): string | null {
    if (fileUrl.startsWith(`${this.publicBaseUrl}/`)) {
      return fileUrl.substring(this.publicBaseUrl.length + 1);
    }

    try {
      const url = new URL(fileUrl);
      return stripSlashes(url.pathname);
    } catch {
      return null;
    }
  }
}

const sanitizeFolder = (folder: string): string => {
  const sanitized = folder.replace(/[^a-zA-Z0-9\-_]/g, "");
  return sanitized || "assets";
};

const stripTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value.replace(/\/+$/, "") : value;

const stripSlashes = (value: string): string =>
  value.replace(/^\/+/, "").replace(/\/+$/, "");

export const storageProvider: StorageProvider =
  env.STORAGE_PROVIDER === "s3"
    ? new S3StorageProvider({
        region: env.AWS_REGION,
        bucket: env.S3_UPLOAD_BUCKET,
        publicBaseUrl: env.S3_UPLOAD_PUBLIC_BASE_URL,
        keyPrefix: env.S3_UPLOAD_PREFIX,
      })
    : new LocalStorageProvider();
