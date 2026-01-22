"use server";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// DigitalOcean Spaces is S3-compatible
const spacesClient = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || `https://${process.env.DO_SPACES_REGION || "sfo3"}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION || "sfo3",
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "";
const CDN_URL = process.env.DO_SPACES_CDN_URL || "";

export interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload image to DigitalOcean Spaces
 */
export async function uploadImageToSpaces(
  file: File | Buffer,
  filename?: string,
  folder: string = "products"
): Promise<UploadImageResult> {
  try {
    if (!BUCKET_NAME) {
      return { success: false, error: "DigitalOcean Spaces not configured" };
    }

    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return { success: false, error: "File size exceeds 5MB limit" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    let mimeType = "image/jpeg";
    
    if (file instanceof File) {
      mimeType = file.type;
      if (!allowedTypes.includes(mimeType)) {
        return { success: false, error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." };
      }
    }

    // Generate unique filename
    const extension = mimeType.split("/")[1] || "jpg";
    const uniqueFilename = filename || `${randomUUID()}.${extension}`;
    const key = `${folder}/${uniqueFilename}`;

    // Upload to Spaces
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read", // Make images publicly accessible
    });

    await spacesClient.send(command);

    // Return CDN URL or Spaces URL
    const imageUrl = CDN_URL
      ? `${CDN_URL}/${key}`
      : `https://${BUCKET_NAME}.${process.env.DO_SPACES_REGION || "sfo3"}.digitaloceanspaces.com/${key}`;

    return { success: true, url: imageUrl };
  } catch (error) {
    console.error("[uploadImageToSpaces] Error:", error);
    return { success: false, error: "Failed to upload image" };
  }
}

/**
 * Delete image from DigitalOcean Spaces
 */
export async function deleteImageFromSpaces(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!BUCKET_NAME || !imageUrl) {
      return { success: false, error: "Invalid configuration or URL" };
    }

    // Extract key from URL
    let key = imageUrl;
    if (imageUrl.includes(CDN_URL)) {
      key = imageUrl.replace(CDN_URL + "/", "");
    } else if (imageUrl.includes(".digitaloceanspaces.com/")) {
      key = imageUrl.split(".digitaloceanspaces.com/")[1];
    }

    if (!key) {
      return { success: false, error: "Could not extract key from URL" };
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await spacesClient.send(command);
    return { success: true };
  } catch (error) {
    console.error("[deleteImageFromSpaces] Error:", error);
    return { success: false, error: "Failed to delete image" };
  }
}

