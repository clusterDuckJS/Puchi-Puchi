import { supabase } from "./supabase";
import { convertImageToWebp } from "./images";

const REVIEW_IMAGES_BUCKET = "review-images";
const REVIEW_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const uploadReviewImage = async ({ file, userId }) => {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > REVIEW_IMAGE_MAX_BYTES) {
    throw new Error("Review images must be 10MB or smaller.");
  }

  const webpFile = await convertImageToWebp(file);
  const filePath = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(REVIEW_IMAGES_BUCKET)
    .upload(filePath, webpFile, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(REVIEW_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  return { path: filePath, publicUrl: data.publicUrl };
};

export const deleteReviewImage = async (path) => {
  if (!path) return;

  await supabase.storage.from(REVIEW_IMAGES_BUCKET).remove([path]);
};
