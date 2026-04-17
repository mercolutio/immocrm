import type { PropertyImage } from "@/lib/types";
import type { UseGalleryReturn } from "./useGallery";

export default function GalleryModal({
  images,
  gallery,
}: {
  images: PropertyImage[];
  gallery: UseGalleryReturn;
}) {
  const {
    setShowGallery, galleryIdx, setGalleryIdx, uploading,
    dragOverGallery, setDragOverGallery, dragIdx, setDragIdx,
    dropTargetIdx, setDropTargetIdx, galleryFileRef,
    imgUrl, thumbUrl, uploadFiles, deleteImage, setCover, reorderImages,
  } = gallery;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "dialogBackdropIn 200ms ease both",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowGallery(false); }}
      onDragOver={(e) => { e.preventDefault(); if (dragIdx === null && e.dataTransfer.types.includes("Files")) setDragOverGallery(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverGallery(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOverGallery(false); if (dragIdx === null && e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
    >
      {dragOverGallery && dragIdx === null && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2001, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(194,105,42,0.12)", border: "3px dashed var(--accent)",
          borderRadius: 20,
        }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: "24px 40px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", textAlign: "center" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 8 }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)" }}>Fotos hier ablegen</div>
          </div>
        </div>
      )}

      <div
        style={{
          width: "min(1380px, 94vw)", maxHeight: "94vh",
          background: "var(--card)", borderRadius: 20, overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--t1)", flex: 1 }}>
            Fotos verwalten
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--t2)", marginLeft: 8 }}>{images.length} Foto{images.length !== 1 ? "s" : ""}</span>
          </div>

          {images.length > 0 && (
            <button
              onClick={() => { if (!images[galleryIdx]?.is_cover) setCover(images[galleryIdx]); }}
              disabled={images[galleryIdx]?.is_cover}
              style={{
                height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid var(--border)",
                background: images[galleryIdx]?.is_cover ? "rgba(194,105,42,0.1)" : "var(--bg)",
                cursor: images[galleryIdx]?.is_cover ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
                color: images[galleryIdx]?.is_cover ? "var(--accent)" : "var(--t2)", fontFamily: "inherit",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={images[galleryIdx]?.is_cover ? "var(--accent)" : "none"} stroke={images[galleryIdx]?.is_cover ? "none" : "currentColor"} strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
              {images[galleryIdx]?.is_cover ? "Cover" : "Als Cover"}
            </button>
          )}

          {images.length > 0 && (
            <button
              onClick={() => deleteImage(images[galleryIdx])}
              style={{
                height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid rgba(201,59,46,0.2)",
                background: "rgba(201,59,46,0.06)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500,
                color: "var(--red)", fontFamily: "inherit",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
              Löschen
            </button>
          )}

          <button
            onClick={() => setShowGallery(false)}
            style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "var(--bg2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)", flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Main Image */}
        {images.length > 0 ? (
          <div style={{ position: "relative", width: "100%", aspectRatio: "3/2", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            <img
              src={imgUrl(images[galleryIdx]?.storage_path ?? "")}
              alt={images[galleryIdx]?.file_name ?? ""}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIdx((i) => (i - 1 + images.length) % images.length)}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  onClick={() => setGalleryIdx((i) => (i + 1) % images.length)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </>
            )}

            <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
              {galleryIdx + 1} / {images.length}
            </div>
          </div>
        ) : (
          <div
            style={{
              height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
              background: "var(--bg)",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: 14, color: "var(--t2)", fontWeight: 500 }}>Fotos hierher ziehen</span>
            <span style={{ fontSize: 12, color: "var(--t2)" }}>oder</span>
            <button
              onClick={() => galleryFileRef.current?.click()}
              className="btn-primary"
              style={{ height: 34, padding: "0 16px", fontSize: 13 }}
            >
              Dateien auswählen
            </button>
          </div>
        )}

        {/* Thumbnail strip */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 0, flex: 1, overflowX: "auto", scrollbarWidth: "thin", paddingBottom: 2, alignItems: "center" }}>
            {images.map((img, i) => (
              <div key={img.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: dropTargetIdx === i && dragIdx !== null && dragIdx !== i ? 3 : 0,
                  height: 40, borderRadius: 2, background: "var(--accent)", flexShrink: 0,
                  margin: dropTargetIdx === i && dragIdx !== null && dragIdx !== i ? "0 3px" : 0,
                  transition: "width 0.12s, margin 0.12s",
                }} />
                <div
                  draggable
                  onDragStart={(e) => { setDragIdx(i); e.stopPropagation(); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTargetIdx(i); }}
                  onDragLeave={() => { if (dropTargetIdx === i) setDropTargetIdx(null); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null) { reorderImages(dragIdx, i); setDragIdx(null); setDropTargetIdx(null); } }}
                  onDragEnd={() => { setDragIdx(null); setDropTargetIdx(null); }}
                  onClick={() => setGalleryIdx(i)}
                  style={{
                    width: 64, height: 48, borderRadius: 8, overflow: "hidden", cursor: "grab", flexShrink: 0,
                    border: galleryIdx === i ? "2px solid var(--accent)" : "1px solid rgba(0,0,0,0.08)",
                    opacity: dragIdx === i ? 0.35 : 1,
                    transform: dragIdx === i ? "scale(0.9)" : "scale(1)",
                    position: "relative",
                    transition: "border var(--dur-in) var(--ease-out), opacity var(--dur-out) var(--ease-out), transform var(--dur-out) var(--ease-out)",
                    margin: "0 3px",
                  }}
                >
                  <img src={thumbUrl(img)} alt={img.file_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                  {img.is_cover && (
                    <div style={{ position: "absolute", top: 2, left: 2, width: 12, height: 12, borderRadius: 2, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div
            onClick={() => galleryFileRef.current?.click()}
            style={{
              width: 64, height: 48, borderRadius: 8, flexShrink: 0, cursor: "pointer",
              border: "2px dashed rgba(0,0,0,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t3)",
              transition: "all var(--dur-out) var(--ease-out)",
            }}
          >
            {uploading ? (
              <div style={{ width: 16, height: 16, border: "2px solid var(--t3)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </div>
          <input ref={galleryFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) { uploadFiles(Array.from(e.target.files)); e.target.value = ""; } }} />
        </div>
      </div>
    </div>
  );
}
