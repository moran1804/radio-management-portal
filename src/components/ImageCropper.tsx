import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImageBlob: Blob) => void;
  imageFile: File | null;
}

export const ImageCropper = ({ isOpen, onClose, onSave, imageFile }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (imageFile && isOpen) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setZoom([1]);
        setPosition({ x: 0, y: 0 });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile, isOpen]);

  useEffect(() => {
    drawImage();
  }, [image, zoom, position]);

  const drawImage = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300; // Fixed canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Create circular clipping path
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate scaled image dimensions
    const scale = zoom[0];
    const imageAspect = image.width / image.height;
    let drawWidth, drawHeight;

    if (imageAspect > 1) {
      // Landscape image
      drawHeight = size * scale;
      drawWidth = drawHeight * imageAspect;
    } else {
      // Portrait or square image
      drawWidth = size * scale;
      drawHeight = drawWidth / imageAspect;
    }

    // Center the image and apply position offset
    const x = (size - drawWidth) / 2 + position.x;
    const y = (size - drawHeight) / 2 + position.y;

    // Draw the image
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left - position.x,
        y: e.clientY - rect.top - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/png', 1.0);
  };

  const resetCrop = () => {
    setZoom([1]);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas for cropping */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="border border-gray-200 rounded-full cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Zoom slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom</span>
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">{zoom[0].toFixed(1)}x</span>
                <ZoomIn className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <Slider
              value={zoom}
              onValueChange={setZoom}
              max={3}
              min={0.5}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-500 text-center">
            Drag to reposition • Use slider to zoom
          </p>

          {/* Action buttons */}
          <div className="flex gap-2 justify-between">
            <Button variant="outline" onClick={resetCrop}>
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};