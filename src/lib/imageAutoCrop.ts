/**
 * Intelligent Image Auto-Crop & Auto-Rotate Engine for Copper Demerits
 *
 * Automatically normalizes EXIF orientation, detects paper receipt boundaries
 * against bar countertops (wood, slate, copper) using row/column density profiling,
 * and rotates landscape slips upright so citations display clearly on the Ring of Honor scoreboard.
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
 * Analyzes pixel luminosity, color saturation, and density profiling to detect the bounding box
 * of a light-colored paper receipt against typical sports bar countertops (copper, wood, slate, mahogany).
 *
 * Uses row and column density histograms to eliminate single-pixel specular glare, countertop scratches,
 * and edge reflections that could otherwise expand the bounding box to the entire frame.
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
    let sumLum = 0;
    const totalSamplePixels = sampleW * sampleH;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      sumLum += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgLum = sumLum / totalSamplePixels;

    // Thresholds:
    // Physical receipt paper in bar lighting is neutral off-white/cream (|R - B| < 55, |R - G| < 45).
    // Copper bar countertops are warm amber/reddish-brown (R is high, B is low, R - B > 50).
    // Dark mahogany/slate is low luminance (lum < 95).
    const minLumThreshold = Math.max(118, Math.min(170, avgLum + 16));

    // Density histograms across rows and columns
    const rowPaperCount = new Uint16Array(sampleH);
    const colPaperCount = new Uint16Array(sampleW);
    let totalPaperPixels = 0;

    for (let y = 0; y < sampleH; y++) {
      for (let x = 0; x < sampleW; x++) {
        const idx = (y * sampleW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Is this pixel paper-like?
        // Must be sufficiently bright, and color saturation must be low (neutral paper vs copper glare)
        const isNeutralChroma = Math.abs(r - b) < 55 && Math.abs(r - g) < 45;
        const isNotCopperCounter = !(r > 120 && b < 80 && (r - b) > 50);

        if (lum >= minLumThreshold && isNeutralChroma && isNotCopperCounter) {
          rowPaperCount[y]++;
          colPaperCount[x]++;
          totalPaperPixels++;
        }
      }
    }

    const paperRatio = totalPaperPixels / totalSamplePixels;
    // Paper must occupy a realistic portion of the photo (15% to 92%)
    if (paperRatio < 0.15 || paperRatio > 0.94) {
      return null;
    }

    // 2. Identify paper boundaries using density thresholds
    // A valid row must contain at least 18% paper pixels across its width
    // A valid column must contain at least 12% paper pixels across its height
    const rowThreshold = Math.max(4, Math.round(sampleW * 0.18));
    const colThreshold = Math.max(4, Math.round(sampleH * 0.12));

    let minY = -1;
    let maxY = -1;
    for (let y = 0; y < sampleH; y++) {
      if (rowPaperCount[y] >= rowThreshold) {
        if (minY === -1) minY = y;
        maxY = y;
      }
    }

    let minX = -1;
    let maxX = -1;
    for (let x = 0; x < sampleW; x++) {
      if (colPaperCount[x] >= colThreshold) {
        if (minX === -1) minX = x;
        maxX = x;
      }
    }

    if (minX === -1 || maxX === -1 || minY === -1 || maxY === -1 || minX >= maxX || minY >= maxY) {
      return null;
    }

    const detectedW = maxX - minX;
    const detectedH = maxY - minY;

    // Minimum size check (must be at least 22% of dimension)
    if (detectedW < sampleW * 0.22 || detectedH < sampleH * 0.20) {
      return null;
    }

    // If the detected paper already occupies >= 95% of both dimensions, no cropping needed
    if (detectedW >= sampleW * 0.95 && detectedH >= sampleH * 0.95) {
      return null;
    }

    // Add 3.5% safety margin padding so text or edges are never clipped
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

  // In rotated context: draw the cropped region centered
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
 * 1. Analyzes paper boundaries using density profiling to ignore table reflections.
 * 2. Checks orientation: Cherry Printers A6 slips are landscape (width > height).
 *    When captured sideways in a portrait smartphone photo (boxH > boxW * 1.05 or height > width * 1.15),
 *    rotates 270° clockwise (90° counter-clockwise) so the slip is horizontal and upright.
 * 3. Crops excess countertop if paper boundaries are detected.
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
  // If no rotation forced, determine whether the landscape slip is photographed sideways:
  // Demerit slips are naturally landscape (aspect ratio ~1.4 : 1, width > height).
  // A portrait phone photo holds the slip vertically (height > width).
  // Rotating 270° clockwise (90° CCW) places the top header at the top and makes the text upright!
  if (options?.forcedRotation === undefined) {
    if (normBox) {
      const boxW = (normBox.xMax - normBox.xMin) * width;
      const boxH = (normBox.yMax - normBox.yMin) * height;
      if (boxH > boxW * 1.05) {
        rotationDeg = 270;
      } else {
        rotationDeg = 0;
      }
    } else {
      // Fallback: If no crop box detected, check photo aspect ratio.
      // If photo is portrait (typical smartphone capture), the landscape slip is sideways.
      if (height > width * 1.15) {
        rotationDeg = 270;
      } else {
        rotationDeg = 0;
      }
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
