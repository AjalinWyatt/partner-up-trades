import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const FRAME = 280; // dialog crop circle size in px
const OUTPUT = 512; // exported image size

const AvatarCropDialog = ({ open, imageSrc, onCancel, onConfirm }: AvatarCropDialogProps) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset when a new image arrives
  useEffect(() => {
    if (!open || !imageSrc) return;
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [open, imageSrc]);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setImgSize({ w: natW, h: natH });
    // Cover the frame: scale so the smaller dim fills FRAME
    const cover = Math.max(FRAME / natW, FRAME / natH);
    setBaseSize({ w: natW * cover, h: natH * cover });
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const clampOffset = (x: number, y: number, s: number) => {
    const w = baseSize.w * s;
    const h = baseSize.h * s;
    const maxX = Math.max(0, (w - FRAME) / 2);
    const maxY = Math.max(0, (h - FRAME) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy, scale));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  };

  const handleScale = (val: number[]) => {
    const s = val[0];
    setScale(s);
    setOffset((prev) => clampOffset(prev.x, prev.y, s));
  };

  const handleConfirm = async () => {
    if (!imgRef.current || !imgSize.w) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map displayed pixels back to source pixels.
    // displayed image size = baseSize * scale; source size = imgSize.
    const displayedW = baseSize.w * scale;
    const srcPerDisplayed = imgSize.w / displayedW;

    // The crop window in displayed coords is centered at (FRAME/2 - offset.x, FRAME/2 - offset.y) of image-local origin.
    // Image is centered in frame, then translated by offset.
    // Top-left of image in frame coords: (FRAME/2 - displayedW/2 + offset.x, FRAME/2 - displayedH/2 + offset.y)
    const displayedH = baseSize.h * scale;
    const imgLeftInFrame = FRAME / 2 - displayedW / 2 + offset.x;
    const imgTopInFrame = FRAME / 2 - displayedH / 2 + offset.y;
    // Crop rect in image-displayed coords:
    const cropDx = -imgLeftInFrame;
    const cropDy = -imgTopInFrame;
    const sx = cropDx * srcPerDisplayed;
    const sy = cropDy * srcPerDisplayed;
    const sSize = FRAME * srcPerDisplayed;

    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => { if (blob) onConfirm(blob); }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Position your photo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 pt-2">
          <div
            className="relative overflow-hidden rounded-full bg-black touch-none select-none"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                onLoad={handleImgLoad}
                draggable={false}
                alt="Crop preview"
                style={{
                  width: baseSize.w * scale,
                  height: baseSize.h * scale,
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  maxWidth: "none",
                  pointerEvents: "none",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/60" />
          </div>
          <div className="w-full px-2">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Zoom</p>
            <Slider min={1} max={4} step={0.01} value={[scale]} onValueChange={handleScale} />
          </div>
          <p className="text-xs text-muted-foreground">Drag to reposition · pinch or use slider to zoom</p>
          <div className="flex w-full gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
            <Button className="flex-1" onClick={handleConfirm}>Save photo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropDialog;