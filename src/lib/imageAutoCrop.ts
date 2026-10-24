/**
 * Intelligent Image Auto-Crop & Auto-Rotate Engine for Copper Demerits
 *
 * Automatically normalizes EXIF orientation, detects paper receipt boundaries
 * against bar countertops (wood, slate, copper), and rotates landscape slips upright
 * so citations display clearly on the Ring of Honor scoreboard.
 */

export interface NormalizedCropBox {
  xMin: number; // 0.0 to 1.0
  yMin: number;
  xMax: number;
  yMax: number;
}

export interface PixelCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AutoCropAndRotateResult {
  dataUrl: string;
  rotationApplied: number; // 0, 90, 180, 270
  wasCropped: boolean;
  cropBox: PixelCropBox;
  width: number;
  height: number;
}

/**
 * Loads an image file or Data URL into an HTMLImageElement with EXIF orientation normalization.
 */
export async function loadImageElement(source: File | Blob | string): Promise<{
  img: HTMLImageElement;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    let srcUrl = '';

    if (typeof source === 'string') {
      srcUrl = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      srcUrl = objectUrl;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve({ img, width, height });
    };

    img.onerror = (err) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error(`Failed to load image: ${err}`));
    };

    img.src = srcUrl;
  });
}

/**
 * Analyzes pixel luminosity and contrast to detect the bounding box of a light-colored paper receipt
 * against a typical dark sports bar countertop (dark wood, copper, slate).
 */
export function detectReceiptPaperBounds(
  img: HTMLImageElement,
  imgWidth: number,
  imgHeight: number
): NormalizedCropBox | null {
  try {
    // Downscale to a fast analysis grid (max 240px dimension)
    const scale = Math.min(1, 240 / Math.max(imgWidth, imgHeight));
    const sampleW = Math.max(40, Math.round(imgWidth * scale));
    const sampleH = Math.max(40, Math.round(imgHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // 1. Calculate overall scene luminance distribution
    const luminances: number[] = new Array(sampleW * sampleH);
    let sumLum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Standard perceived luminance formula
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminances[i / 4] = lum;
      sumLum += lum;
    }
    const avgLum = sumLum / luminances.length;

    // Threshold: Paper receipts in dim bar lighting are significantly brighter than the background
    // (Luminance threshold is typically ~130-150, or at least 25% above average scene luminance)
    const paperThreshold = Math.max(125, Math.min(185, avgLum + 22));

    // 2. Identify bounding limits containing paper pixels
    let minX = sampleW;
    let maxX = 0;
    let minY = sampleH;
    let maxY = 0;
    let paperPixelCount = 0;

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = y * sampleW + x;
        const lum = luminances[idx];
        if (lum >= paperThreshold) {
          paperPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = sampleW * sampleH;
    const paperRatio = paperPixelCount / totalPixels;

    // Only crop if detected paper occupies a plausible portion of the photo (between 20% and 92%)
    // If it's <20%, it might be a reflection; if >92%, the receipt already fills the frame.
    if (paperRatio < 0.2 || paperRatio > 0.94 || minX >= maxX || minY >= maxY) {
      return null;
    }

    const detectedW = maxX - minX;
    const detectedH = maxY - minY;
    if (detectedW < sampleW * 0.25 || detectedH < sampleH * 0.25) {
      return null;
    }

    // Add 3.5% safety margin padding so text or edges are never cut off
    const padX = detectedW * 0.035;
    const padY = detectedH * 0.035;

    const normXMin = Math.max(0, (minX - padX) / sampleW);
    const normXMax = Math.min(1, (maxX + padX) / sampleW);
    const normYMin = Math.max(0, (minY - padY) / sampleH);
    const normYMax = Math.min(1, (maxY + padY) / sampleH);

    return {
      xMin: normXMin,
      yMin: normYMin,
      xMax: normXMax,
      yMax: normYMax,
    };
  } catch {
    return null;
  }
}

/**
 * Renders an image onto a Canvas with exact rotation (0, 90, 180, 270) and optional cropping.
 */
export function renderTransformedCanvas(
  img: HTMLImageElement,
  rotationDeg: number,
  cropBox?: PixelCropBox | null,
  maxDimension = 1200,
  quality = 0.8
): { canvas: HTMLCanvasElement; dataUrl: string } {
  const normRot = ((rotationDeg % 360) + 360) % 360;

  // Step 1: Crop region from source image (or use entire image)
  const sx = cropBox ? Math.max(0, cropBox.x) : 0;
  const sy = cropBox ? Math.max(0, cropBox.y) : 0;
  const sw = cropBox ? Math.min(img.naturalWidth - sx, cropBox.width) : img.naturalWidth;
  const sh = cropBox ? Math.min(img.naturalHeight - sy, cropBox.height) : img.naturalHeight;

  // Step 2: Determine canvas dimensions based on rotation
  const isPerpendicular = normRot === 90 || normRot === 270;
  let targetW = isPerpendicular ? sh : sw;
  let targetH = isPerpendicular ? sw : sh;

  // Downscale if exceeds max dimension
  if (targetW > maxDimension || targetH > maxDimension) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDimension) / targetW);
      targetW = maxDimension;
    } else {
      targetW = Math.round((targetW * maxDimension) / targetH);
      targetH = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill clean neutral background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  ctx.save();
  // Translate to center of canvas for rotation
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((normRot * Math.PI) / 180);

  // Draw the cropped source region centered
  const drawW = isPerpendicular ? targetH : targetW;
  const drawH = isPerpendicular ? targetW : targetH;
  ctx.drawImage(img, sx, sy, sw, sh, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/jpeg', quality),
  };
}

/**
 * End-to-end automatic crop and rotation processor.
 * 1. Checks aspect ratio and paper boundary.
 * 2. If image is landscape (width > height * 1.2) but receipt paper is portrait, auto-rotates 90° CW.
 * 3. If paper bounds are detected, crops out the excess counter.
 */
export async function autoCropAndRotateSlip(
  source: File | Blob | string,
  options?: {
    forcedRotation?: number;
    customCrop?: NormalizedCropBox;
    maxDimension?: number;
    quality?: number;
  }
): Promise<AutoCropAndRotateResult> {
  const { img, width, height } = await loadImageElement(source);

  let rotationDeg = options?.forcedRotation !== undefined ? options.forcedRotation : 0;
  let wasCropped = false;

  // 1. Detect paper boundary
  let normBox: NormalizedCropBox | null = options?.customCrop || null;
  if (!normBox) {
    normBox = detectReceiptPaperBounds(img, width, height);
  }

  // 2. Auto-Rotation Check:
  // If no rotation forced, determine if the slip is sideways:
  // Receipts are tall (portrait) receipts. If image is distinctly landscape (width > height * 1.18),
  // rotate 90 degrees clockwise to make it upright!
  if (options?.forcedRotation === undefined) {
    const isLandscape = width > height * 1.18;
    if (isLandscape) {
      rotationDeg = 90;
    }
  }

  // Compute pixel crop box
  let cropBox: PixelCropBox;
  if (normBox) {
    cropBox = {
      x: Math.round(normBox.xMin * width),
      y: Math.round(normBox.yMin * height),
      width: Math.round((normBox.xMax - normBox.xMin) * width),
      height: Math.round((normBox.yMax - normBox.yMin) * height),
    };
    wasCropped = true;
  } else {
    cropBox = {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  const { dataUrl, canvas } = renderTransformedCanvas(
    img,
    rotationDeg,
    wasCropped ? cropBox : null,
    options?.maxDimension || 1100,
    options?.quality || 0.78
  );

  return {
    dataUrl,
    rotationApplied: rotationDeg,
    wasCropped,
    cropBox,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Manually rotates an existing image by +90° or -90° clockwise.
 */
export async function rotateImageClockwise(
  imageSource: string,
  additionalDeg = 90,
  quality = 0.78
): Promise<string> {
  const { img } = await loadImageElement(imageSource);
  const { dataUrl } = renderTransformedCanvas(img, additionalDeg, null, 1100, quality);
  return dataUrl;
}
