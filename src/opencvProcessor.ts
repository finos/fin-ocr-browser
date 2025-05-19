/**
 * Copyright (c) 2024 Capital One
*/
import cv from '@techstark/opencv-js';

let streaming = true;

export function processVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  const dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  const cap = new cv.VideoCapture(video);

  const FPS = 15;

  // Parameters for Canny
  const cannyLowThreshold = 50;
  const cannyHighThreshold = 150;

  // Minimum rectangle area (i.e., % of frame area)
  const minRectAreaRatio = 0.15;
  /*
    TODO:
    1. Tune the GaussianBlur and Canny edge detection parameters
    2. Consider 'adaptive thresholding' for Canny edge detection to handle varying lighting conditions.
  */
  function processFrame(): void {
      try {
          if (!streaming) {
              // Clean up and stop if the video stream is not active.
              src.delete();
              dst.delete();
              gray.delete();
              blur.delete();
              edges.delete();
              contours.delete();
              hierarchy.delete();
              return;
          }
          const begin = Date.now();

          cap.read(src); // Capture the frame from the video.
          src.copyTo(dst); // Copy the captured frame to destination Mat.
          cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0); // Convert to grayscale
          cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0); // Apply Gaussian blur to reduce noise
          cv.Canny(blur, edges, cannyLowThreshold, cannyHighThreshold); // Canny edge detection

          // Find contours in the edge-detected image
          cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

          // Clear the canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw the video frame on the canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          let largestRect: cv.Rect | null = null;
          let maxRectArea = 0;
          const frameArea = video.width * video.height;
          const minRectArea = frameArea * minRectAreaRatio;

          for (let i = 0; i < contours.size(); i++) {
              const contour = contours.get(i);
              const approx = new cv.Mat();
              cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true); // Approximate contour to polygon.

              // maybe 3 is if the angles are ~90...to handle partially on screen check if desired, but not sure
              if (approx.rows === 4) { // Check if the contour has 4 vertices (potential rectangle).
                  const rect = cv.boundingRect(approx);
                  const rectArea = rect.width * rect.height;

                  // Filter based on area and aspect ratio.
                  if (rectArea >= minRectArea && rectArea > maxRectArea && rect.width >= 2 * rect.height) {
                      largestRect = rect;
                      maxRectArea = rectArea;
                  }
              }
              approx.delete();
          }

          if (largestRect) {
              // Draw the bounding rect of largest detected rectangle
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 2;
              ctx.strokeRect(largestRect.x, largestRect.y, largestRect.width, largestRect.height);
          }

          // Schedule the next frame.
          const delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processFrame, Math.max(0, delay));
      } catch (err) {
          console.error(err);
      }
  }

  // Schedule the first frame.
  requestAnimationFrame(processFrame);
}

export async function captureFrameAndPause(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<cv.Mat> {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to grayscale
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const grayData = new Uint8ClampedArray(imageData.data.length);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
      grayData[i] = grayData[i + 1] = grayData[i + 2] = avg;
      grayData[i + 3] = imageData.data[i + 3];
    }
    imageData.data.set(grayData);
    ctx.putImageData(imageData, 0, 0);

    // Create cv.Mat from imageData
    const mat = cv.matFromImageData(imageData);

    // Stop frame processing
    streaming = false;

    return mat;
  } else {
    throw new Error("Could not get canvas context");
  }
}

export function resetCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  streaming = true;
  requestAnimationFrame(() => processVideo(video, canvas));
}
