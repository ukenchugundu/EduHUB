import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export class StorageService {
  private supabase: SupabaseClient | null = null;
  private bucketName: string;
  private localUploadsDir: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || "EduHub";
    this.localUploadsDir = path.resolve(__dirname, "..", "..", "uploads");

    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log(`[Storage] Connected to Supabase Storage (Bucket: ${this.bucketName})`);
      } catch (err) {
        console.warn("[Storage] Failed to initialize Supabase client, defaulting to local uploads:", err);
      }
    } else {
      console.log("[Storage] Supabase credentials not found. Using local uploads directory.");
    }
  }

  /**
   * Uploads a file either to Supabase Storage or falls back to the local uploads directory.
   * Returns the accessible URL of the uploaded file.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = "general",
  ): Promise<{ url: string; storageType: "supabase" | "local"; key: string }> {
    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.storage
          .from(this.bucketName)
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = this.supabase.storage
            .from(this.bucketName)
            .getPublicUrl(storagePath);

          return {
            url: publicUrlData.publicUrl,
            storageType: "supabase",
            key: storagePath,
          };
        }
        console.warn("[Storage] Supabase upload failed, falling back to local:", error?.message);
      } catch (err) {
        console.warn("[Storage] Supabase exception, falling back to local:", err);
      }
    }

    // Fallback: Local filesystem upload
    const localTargetDir = path.join(this.localUploadsDir, folder);
    if (!fs.existsSync(localTargetDir)) {
      fs.mkdirSync(localTargetDir, { recursive: true });
    }

    const localFileName = `${timestamp}_${sanitizedName}`;
    const localFilePath = path.join(localTargetDir, localFileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      url: `/uploads/${folder}/${localFileName}`,
      storageType: "local",
      key: `${folder}/${localFileName}`,
    };
  }

  /**
   * Deletes a file from storage
   */
  async deleteFile(key: string, storageType: "supabase" | "local"): Promise<boolean> {
    if (storageType === "supabase" && this.supabase) {
      try {
        const { error } = await this.supabase.storage
          .from(this.bucketName)
          .remove([key]);
        return !error;
      } catch {
        return false;
      }
    }

    // Local delete
    try {
      const fullPath = path.join(this.localUploadsDir, key);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}

export const storageService = new StorageService();
export default storageService;
