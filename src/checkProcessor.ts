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

export interface ScanResults {
  tesseract?: CheckDetails;
  opencv?: CheckDetails;
}

export async function scanImage(checkMgr: ocr.CheckMgr, image: cv.Mat): Promise<ScanResults> {

  const imageData = new ImageData(new Uint8ClampedArray(image.data), image.cols, image.rows);

  const canvas = document.createElement('canvas');
  canvas.width = image.cols;
  canvas.height = image.rows;
  const ctx = canvas.getContext('2d');
  ctx?.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const base64Image = dataUrl.split(',')[1];


  const buffer = new Uint8Array(decode(base64Image));

  try {
    const scanRequest: ocr.CheckScanRequest = { id: 'checkImage', image: { buffer, format: ocr.ImageFormat.PNG } };
    console.log('Sending scan request to CheckMgr...');
    const result: ocr.CheckScanResponse = await checkMgr.scan(scanRequest);

    const tesseractResult = result.translators.tesseract?.result || {};
    const opencvResult = result.translators.opencv?.result || {};


    return {
      tesseract: {
        routingNumber: tesseractResult.routingNumber || 'Not Found',
        accountNumber: tesseractResult.accountNumber || 'Not Found',
        checkNumber: tesseractResult.checkNumber || 'Not Found',
      },
      opencv: {
        routingNumber: opencvResult.routingNumber || 'Not Found',
        accountNumber: opencvResult.accountNumber || 'Not Found',
        checkNumber: opencvResult.checkNumber || 'Not Found',
      }
    };
  } catch (error) {
    console.error('Error scanning image:', error);
    return {
      tesseract: {
        routingNumber: 'Not Found',
        accountNumber: 'Not Found',
        checkNumber: 'Not Found'
      },
      opencv: {
        routingNumber: 'Not Found',
        accountNumber: 'Not Found',
        checkNumber: 'Not Found'
      }
    };
  }
}
