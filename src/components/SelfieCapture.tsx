import { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { store } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface SelfieCaptureProps {
  onCapture: (imageUrl: string) => void;
  onCancel?: () => void;
  title?: string;
  required?: boolean;
}

export function SelfieCapture({ onCapture, onCancel, title = "Take Selfie", required = true }: SelfieCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current && !capturedImage) {
      const video = videoRef.current;
      
      // Only set srcObject if it's different
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      
      // Wait for video to be ready before playing
      const playVideo = async () => {
        try {
          // Wait for video metadata to load
          if (video.readyState < 2) {
            await new Promise((resolve) => {
              const onLoadedMetadata = () => {
                video.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve(undefined);
              };
              video.addEventListener('loadedmetadata', onLoadedMetadata);
            });
          }
          
          // Only play if not already playing
          if (video.paused) {
            await video.play();
          }
        } catch (err) {
          // AbortError is expected when video source changes - ignore it
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('Error playing video:', err);
          }
        }
      };
      
      playVideo();
    } else if (!stream && videoRef.current) {
      // Clear srcObject when stream is removed
      videoRef.current.srcObject = null;
    }
  }, [stream, capturedImage]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setStream(mediaStream);
    } catch (error) {
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please allow camera permissions.',
        variant: 'destructive',
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Wait for video to be ready
    if (video.readyState < 2) {
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Flip the image horizontally for selfie preview
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          setCapturedImage(imageData);
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }, { once: true });
      return;
    }
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Flip the image horizontally for selfie preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadAndContinue = async () => {
    if (!capturedImage) {
      console.error('[SelfieCapture] No captured image to upload');
      return;
    }

    setUploading(true);
    try {
      console.log('[SelfieCapture] Starting upload process...');
      
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      console.log('[SelfieCapture] File created:', { name: file.name, size: file.size, type: file.type });

      // Try to get upload URL first (for direct S3 upload)
      let key: string;
      try {
        const { uploadUrl, key: uploadKey, fileUrl } = await store.getUploadUrl(
          file.name,
          file.type,
          file.size
        );
        
        console.log('[SelfieCapture] Got upload URL:', { key: uploadKey, fileUrl, uploadUrl: uploadUrl?.substring(0, 50) + '...' });

        // Try direct S3 upload first
        const uploadResult = await store.uploadFileToS3(uploadUrl, file);
        if (uploadResult) {
          // Server-side upload was used (returned key)
          key = uploadResult;
          console.log('[SelfieCapture] Server-side upload successful!');
        } else {
          // Direct S3 upload was successful
          key = uploadKey;
          console.log('[SelfieCapture] Direct S3 upload successful!');
        }
      } catch (error) {
        // If getting upload URL fails, use server-side upload directly
        console.log('[SelfieCapture] Failed to get upload URL, using server-side upload:', error);
        key = await store.uploadFileViaServer(file);
        console.log('[SelfieCapture] Server-side upload successful!');
      }
      
      console.log('[SelfieCapture] Upload successful! Calling onCapture with key:', key);

      // Call onCapture with the S3 key
      onCapture(key);
    } catch (error) {
      console.error('[SelfieCapture] Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload selfie',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    if (onCancel) {
      onCancel();
    }
  };

  // Auto-start camera when component mounts if not captured yet
  useEffect(() => {
    if (!stream && !capturedImage) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stream && !capturedImage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/30 rounded-lg aspect-video">
          <div className="text-center">
            <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground mb-4">
              {required ? 'Starting camera...' : 'Take a selfie (optional)'}
            </p>
            <Button onClick={startCamera} className="gradient-primary">
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          </div>
        </div>
        {!required && (
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Skip
          </Button>
        )}
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative border-2 border-primary rounded-lg overflow-hidden">
          <img src={capturedImage} alt="Captured selfie" className="w-full h-auto" />
        </div>
        <div className="flex gap-2">
          <Button onClick={retakePhoto} variant="outline" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button 
            onClick={uploadAndContinue} 
            className="flex-1 gradient-primary"
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative border-2 border-primary rounded-lg overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm opacity-75">Starting camera...</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleCancel} variant="outline" className="flex-1">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={capturePhoto} 
          className="flex-1 gradient-primary"
          disabled={!stream}
        >
          <Camera className="w-4 h-4 mr-2" />
          Capture
        </Button>
      </div>
    </div>
  );
}

