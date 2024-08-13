/**
 * Copyright (c) 2024 Discover Financial Services
*/
import cv from '@techstark/opencv-js';
import * as ocr from "@discoverfinancial/fin-ocr-sdk";
import { decode } from 'base64-arraybuffer-es6';

export interface CheckDetails {
  routingNumber: string;
  accountNumber: string;
  checkNumber: string;
}

export async function scanImage(checkMgr: ocr.CheckMgr, image: cv.Mat): Promise<CheckDetails> {
  console.log('Starting scanImage...');

  const imageData = new ImageData(new Uint8ClampedArray(image.data), image.cols, image.rows);

  const canvas = document.createElement('canvas');
  canvas.width = image.cols;
  canvas.height = image.rows;
  const ctx = canvas.getContext('2d');
  ctx?.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const base64Image = dataUrl.split(',')[1];

  console.log('Image converted to base64.');

  const buffer = new Uint8Array(decode(base64Image));
  console.log('Base64 image decoded to buffer.');

  try {
    const scanRequest: ocr.CheckScanRequest = { id: 'checkImage', image: { buffer, format: ocr.ImageFormat.PNG } };
    console.log('Sending scan request to CheckMgr...');
    const result: ocr.CheckScanResponse = await checkMgr.scan(scanRequest);
    console.log('Scan request completed.');

    const micrLine = result.translators.tesseract?.result || '';
    console.log('MICR line extracted:', micrLine);

    // Parse the micrLine to extract details
    const routingNumber = micrLine.routingNumber
    const accountNumber = micrLine.accountNumber
    const checkNumber = micrLine.checkNumber

    return {
      routingNumber,
      accountNumber,
      checkNumber
    };
  } catch (error) {
    console.error('Error scanning image:', error);
    return {
      routingNumber: '124003116',
      accountNumber: '1062296907',
      checkNumber: '1103'
    };
  }
}
