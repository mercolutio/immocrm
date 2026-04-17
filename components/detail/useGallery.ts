import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image-utils";
import type { PropertyImage } from "@/lib/types";

export function useGallery(
  propertyId: string,
  images: PropertyImage[],
  setImages: React.Dispatch<React.SetStateAction<PropertyImage[]>>,
) {
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOverGallery, setDragOverGallery] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showGallery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowGallery(false);
      if (e.key === "ArrowLeft")  setGalleryIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setGalleryIdx((i) => (i + 1) % images.length);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showGallery, images.length]);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const imgUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/property-images/${path}`;
  const thumbUrl = (img: PropertyImage) => imgUrl(img.thumb_path ?? img.storage_path);

  const coverImage = images.find((i) => i.is_cover) ?? images[0] ?? null;

  async function uploadFiles(files: FileList | File[]) {
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const newImages: PropertyImage[] = [];
    let maxPos = images.length > 0 ? Math.max(...images.map((i) => i.position)) + 1 : 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const uuid = crypto.randomUUID();
      const mainPath = `${user.id}/${propertyId}/${uuid}.webp`;
      const tPath = `${user.id}/${propertyId}/${uuid}_thumb.webp`;

      try {
        const [mainBlob, thumbBlob] = await Promise.all([
          resizeImage(file, 1920, 0.85),
          resizeImage(file, 400, 0.75),
        ]);

        const [mainRes, thumbRes] = await Promise.all([
          supabase.storage.from("property-images").upload(mainPath, mainBlob, { contentType: "image/webp" }),
          supabase.storage.from("property-images").upload(tPath, thumbBlob, { contentType: "image/webp" }),
        ]);

        if (mainRes.error) { console.error("Main upload error:", mainRes.error.message); continue; }
        if (thumbRes.error) console.error("Thumb upload error:", thumbRes.error.message);

        const { data, error: dbErr } = await supabase
          .from("property_images")
          .insert({
            property_id: propertyId,
            user_id: user.id,
            storage_path: mainPath,
            thumb_path: thumbRes.error ? null : tPath,
            file_name: file.name,
            position: maxPos,
            is_cover: images.length === 0 && newImages.length === 0,
          })
          .select()
          .single();
        if (!dbErr && data) {
          newImages.push(data as PropertyImage);
          maxPos++;
        }
      } catch (err) {
        console.error("Image processing error:", err);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
  }

  async function deleteImage(img: PropertyImage) {
    const supabase = createClient();
    await supabase.storage.from("property-images").remove([img.storage_path]);
    await supabase.from("property_images").delete().eq("id", img.id);
    setImages((prev) => {
      const next = prev.filter((i) => i.id !== img.id);
      if (img.is_cover && next.length > 0) {
        next[0] = { ...next[0], is_cover: true };
        supabase.from("property_images").update({ is_cover: true }).eq("id", next[0].id);
      }
      return next;
    });
    setGalleryIdx((i) => Math.min(i, Math.max(0, images.length - 2)));
  }

  async function setCover(img: PropertyImage) {
    const supabase = createClient();
    const oldCover = images.find((i) => i.is_cover);
    if (oldCover) {
      await supabase.from("property_images").update({ is_cover: false }).eq("id", oldCover.id);
    }
    await supabase.from("property_images").update({ is_cover: true }).eq("id", img.id);
    setImages((prev) => prev.map((i) => ({ ...i, is_cover: i.id === img.id })));
  }

  async function reorderImages(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((img, i) => ({ ...img, position: i }));
    setImages(updated);

    const supabase = createClient();
    for (const img of updated) {
      await supabase.from("property_images").update({ position: img.position }).eq("id", img.id);
    }
  }

  return {
    showGallery, setShowGallery,
    galleryIdx, setGalleryIdx,
    uploading,
    dragOverGallery, setDragOverGallery,
    dragIdx, setDragIdx,
    dropTargetIdx, setDropTargetIdx,
    fileInputRef, galleryFileRef,
    imgUrl, thumbUrl, coverImage,
    uploadFiles, deleteImage, setCover, reorderImages,
  };
}

export type UseGalleryReturn = ReturnType<typeof useGallery>;
