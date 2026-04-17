import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

interface AvatarPickerProps {
  /** Called with a cropped square JPEG File whenever the user changes image / position / zoom */
  onChange: (file: File | null, previewUrl: string | null) => void;
  /** Output square size in px (default 512) */
  outputSize?: number;
  /** Display diameter in px (default 112 = w-28) */
  displaySize?: number;
}

/**
 * Circular avatar picker that lets the user drag the image inside the circle
 * to choose what's centered, plus a zoom slider. Produces a square cropped
 * JPEG matching what the user sees in the circle.
 */
export default function AvatarPicker({ onChange, outputSize = 512, displaySize = 112 }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [src, setSrc] = useState<string | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  // Position offset in display px, relative to centered base-fit image
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Zoom multiplier on top of the cover-fit base scale
  const [zoom, setZoom] = useState(1);

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    const img = new Image();
    img.onload = () => setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // Compute base "cover" scale: image fully covers the circle at zoom=1
  const baseScale = imgNatural
    ? Math.max(displaySize / imgNatural.w, displaySize / imgNatural.h)
    : 1;
  const scale = baseScale * zoom;
  const renderedW = imgNatural ? imgNatural.w * scale : 0;
  const renderedH = imgNatural ? imgNatural.h * scale : 0;
  const maxOffsetX = Math.max(0, (renderedW - displaySize) / 2);
  const maxOffsetY = Math.max(0, (renderedH - displaySize) / 2);

  const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    if (!src) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({
      x: clamp(dragRef.current.ox + dx, maxOffsetX),
      y: clamp(dragRef.current.oy + dy, maxOffsetY),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Re-clamp offset when zoom or image changes
  useEffect(() => {
    setOffset((o) => ({ x: clamp(o.x, maxOffsetX), y: clamp(o.y, maxOffsetY) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxOffsetX, maxOffsetY]);

  // Generate cropped output whenever inputs settle
  useEffect(() => {
    if (!src || !imgNatural) {
      onChange(null, null);
      return;
    }
    const t = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        // Map display-space to output-space
        const ratio = outputSize / displaySize;
        const drawW = renderedW * ratio;
        const drawH = renderedH * ratio;
        const drawX = outputSize / 2 - drawW / 2 + offset.x * ratio;
        const drawY = outputSize / 2 - drawH / 2 + offset.y * ratio;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, outputSize, outputSize);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        canvas.toBlob(
          (blob) => {
            if (!blob) return;
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            onChange(file, url);
          },
          "image/jpeg",
          0.92,
        );
      };
      img.src = src;
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, imgNatural, offset.x, offset.y, zoom]);

  return (
    <div className="flex flex-col items-center mb-7 select-none">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <div
        ref={containerRef}
        className="relative rounded-full border-2 border-foreground/30 overflow-hidden bg-card cursor-grab active:cursor-grabbing"
        style={{ width: displaySize, height: displaySize, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          // Open file picker only when no image yet — otherwise drag is primary action
          if (!src) {
            e.stopPropagation();
            inputRef.current?.click();
          }
        }}
      >
        {src && imgNatural ? (
          <img
            src={src}
            alt="Avatar"
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: renderedW,
              height: renderedH,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              maxWidth: "none",
              pointerEvents: "none",
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-accent flex items-center justify-center border-4 border-background cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <span className="text-accent-foreground text-lg font-bold leading-none">+</span>
        </div>
      </div>
      <p className="text-[13px] text-foreground mt-3">
        {src ? "Drag to reposition · use slider to zoom" : "Upload a picture (optional)"}
      </p>
      {src && (
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-44 mt-2 accent-[hsl(var(--accent))]"
        />
      )}
    </div>
  );
}
