"use client";
/**
 * Shrinks a photo in the browser before upload (long side ≤ 1600 px, JPEG ~0.82).
 * Phone photos are often 3–5 MB; this makes them ~200–400 KB, which is faster on mobile data
 * and stays well under upload limits. Falls back to the original file if anything fails.
 */
export async function shrink(file: File, max = 1600): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 300_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}
