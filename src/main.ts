/**
 * Copyright (c) 2024 Discover Financial Services
 */
import './style.css';
import cv from '@techstark/opencv-js';
import * as ocr from "@discoverfinancial/fin-ocr-sdk";
import {
    scanImage,
    ScanResults
} from './checkProcessor';
import Tesseract from 'tesseract.js';

let streaming = true;
let largestRect: cv.Rect | null = null;
let capturedFrame: cv.Mat | null = null;
let originalFrame: cv.Mat | null = null;
let frameStableCount = 0;
let checkMgr: ocr.CheckMgr;

document.querySelector < HTMLDivElement > ('#app') !.innerHTML = `
  <header class="bg-blue-600 py-6 text-white shadow-lg">
    <div class="container mx-auto px-4">
      <h1 class="text-3xl font-bold text-white">OCR Demo Application</h1>
      <p class="mt-2 text-lg">Demo of how to use <a href="https://github.com/discoverfinancial/fin-ocr-sdk" class="underline">fin-ocr-sdk</a></p>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto mt-8 px-4">
    <section class="grid grid-cols-1 sm:grid-cols-2 gap-8">
      <!-- Manual OCR Processing Column -->
      <div class="bg-slate-100 p-6 rounded-lg shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold">Check Image OCR Analysis</h2>
        <p class="mb-4">Upload a check image directly to extract MICR data using the <a href="https://github.com/discoverfinancial/fin-ocr-sdk" class="text-blue-600 underline">fin-ocr-sdk</a>.</p>
        <div class="flex flex-col items-center">
          <input type="file" id="manualFileInput" class="mb-4 block w-full rounded border border-gray-300 p-2" />
          <button id="manualProcessImageButton" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Extract MICR Data</button>
        </div>
        <div id="manualOcrOutput" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 class="text-xl font-semibold">OpenCV Results</h3>
            <p><strong>Routing Number:</strong> <span id="manualOpencvRoutingNumber">N/A</span></p>
            <p><strong>Account Number:</strong> <span id="manualOpencvAccountNumber">N/A</span></p>
            <p><strong>Check Number:</strong> <span id="manualOpencvCheckNumber">N/A</span></p>
          </div>
          <div>
            <h3 class="text-xl font-semibold">Tesseract Results</h3>
            <p><strong>Routing Number:</strong> <span id="manualTesseractRoutingNumber">N/A</span></p>
            <p><strong>Account Number:</strong> <span id="manualTesseractAccountNumber">N/A</span></p>
            <p><strong>Check Number:</strong> <span id="manualTesseractCheckNumber">N/A</span></p>
          </div>
        </div>
      </div>

      <!-- Check Image Generation Column -->
      <div class="bg-slate-100 p-6 rounded-lg shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold">Generate and Analyze Check Image</h2>
        <p class="mb-4">Generate a simulated check image and run OCR to extract critical MICR data. </p>
        <div class="flex flex-col items-center">
          <button id="generateCheckButton" class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">Generate Check Image</button>
          <button id="generatedProcessImageButton" class="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Extract MICR Data</button>
        </div>
        <div id="generatedCheckImageContainer" class="mt-6">
          <h3 class="mb-2 text-xl font-semibold">Generated Check Image</h3>
          <img id="generatedCheckImage" src="" alt="Generated Check" class="rounded border border-gray-300 p-2" />
        </div>
        <div id="generatedCheckOutput" class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 class="text-xl font-semibold">OpenCV Results</h3>
            <p><strong>Routing Number:</strong> <span id="generatedOpencvRoutingNumber">N/A</span></p>
            <p><strong>Account Number:</strong> <span id="generatedOpencvAccountNumber">N/A</span></p>
            <p><strong>Check Number:</strong> <span id="generatedOpencvCheckNumber">N/A</span></p>
          </div>
          <div>
            <h3 class="text-xl font-semibold">Tesseract Results</h3>
            <p><strong>Routing Number:</strong> <span id="generatedTesseractRoutingNumber">N/A</span></p>
            <p><strong>Account Number:</strong> <span id="generatedTesseractAccountNumber">N/A</span></p>
            <p><strong>Check Number:</strong> <span id="generatedTesseractCheckNumber">N/A</span></p>
          </div>
        </div>
      </div>
    </section>
    -->
  </main>

  <footer class="mt-8 bg-gray-800 py-4 text-white">
    <div class="container mx-auto px-4 text-center">
      <p>&copy; 2024 Discover Financial Services</p>
    </div>
  </footer>
`;

const video = document.getElementById('videoInput') as HTMLVideoElement;
const canvas = document.getElementById('canvasOutput') as HTMLCanvasElement;

const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
const ocrButton = document.getElementById('ocrButton') as HTMLButtonElement;
const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
const contrastSlider = document.getElementById('contrast') as HTMLInputElement;



function preprocessImage(src: cv.Mat): cv.Mat {
    let dst = new cv.Mat();

    if (src.channels() === 3) {
        cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY);
    } else {
        src.copyTo(dst);
    }

    let blurred = new cv.Mat();
    cv.GaussianBlur(dst, blurred, new cv.Size(3, 3), 0);

    let binary = new cv.Mat();
    cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

    let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    let morphed = new cv.Mat();
    cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);

    dst.delete();
    blurred.delete();
    binary.delete();
    kernel.delete();

    return morphed;
}


function displayFrame(mat: cv.Mat, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
    ctx?.putImageData(imageData, 0, 0);
}

const fileInput = document.getElementById('manualFileInput') as HTMLInputElement;
const processImageButton = document.getElementById('processImageButton') as HTMLButtonElement;
let generatedCheckImageUrl: string = '';
let usingUserImage = false;


fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
        usingUserImage = true; // Mark that the user image is being used
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);

                // Display the user's image on the canvas
                const canvasContext = document.getElementById('canvasOutput')?.getContext('2d');
                if (canvasContext) {
                    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                    canvasContext.drawImage(img, 0, 0, canvas.width, canvas.height);
                }

                // Optionally store this image in capturedFrame for processing
                capturedFrame = cv.matFromImageData(ctx?.getImageData(0, 0, canvas.width, canvas.height)!);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
});


function displayManualCheckDetails(results: ScanResults) {
  if (results.tesseract) {
    document.getElementById('tesseractRoutingNumber')!.textContent = results.tesseract.routingNumber;
    document.getElementById('tesseractAccountNumber')!.textContent = results.tesseract.accountNumber;
    document.getElementById('tesseractCheckNumber')!.textContent = results.tesseract.checkNumber;
  }

  if (results.opencv) {
    document.getElementById('opencvRoutingNumber')!.textContent = results.opencv.routingNumber;
    document.getElementById('opencvAccountNumber')!.textContent = results.opencv.accountNumber;
    document.getElementById('opencvCheckNumber')!.textContent = results.opencv.checkNumber;
  }
}

async function generateCheckImage(): Promise<string> {
    const width = 600;
    const height = 250;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get 2D context');
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(10, 10, width - 20, height - 20);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('FIN-OCR Bank', 20, 40);

    ctx.font = 'bold 16px Arial';
    ctx.fillText('Check No. 1234', width - 150, 40);

    ctx.font = '16px Arial';
    ctx.fillText('Date:', width - 160, 70);
    ctx.fillText('08/19/2024', width - 120, 70); // Placeholder date

    ctx.fillText('Pay to the Order of:', 20, 100);
    ctx.fillText('', 200, 100);
    ctx.fillRect(180, 105, 350, 2);

    ctx.fillText('Signature:', width - 200, height - 50);
    ctx.fillRect(width - 120, height - 55, 100, 2); // Line for signature

    const font = new FontFace('MICR', 'url(GnuMICR.ttf)');
    await font.load();
    document.fonts.add(font);
    ctx.font = '16px MICR';

    const [routingNumber, accountNumber, checkNumber] = generateRandomCheckDetails();
    const micrLine = `A${routingNumber}A  ${accountNumber}C  ${checkNumber}`;
    ctx.fillStyle = 'black';
    ctx.fillText(micrLine, 20, height - 25);

    return canvas.toDataURL('image/png');
}


const generateCheckButton = document.getElementById('generateCheckButton') as HTMLButtonElement;
const generatedCheckImage = document.getElementById('generatedCheckImage') as HTMLImageElement;
let currentProcessImageListener: () => void;
generateCheckButton.addEventListener('click', async () => {
    try {
      const newCheckImageUrl = await generateCheckImage();
              updateGeneratedCheckImage(newCheckImageUrl);
    } catch (error) {
        console.error('Error generating check image:', error);
    }
});

function generateRandomCheckDetails(): [string, string, string] {
    const routingNumber = Array.from({
        length: 9
    }, () => Math.floor(Math.random() * 10)).join('');
    const accountNumber = Array.from({
        length: 9
    }, () => Math.floor(Math.random() * 10)).join('');
    const checkNumber = Array.from({
        length: 4
    }, () => Math.floor(Math.random() * 10)).join('');
    return [routingNumber, accountNumber, checkNumber];
}

async function initialize() {
    checkMgr = await ocr.CheckMgr.setInstance({
        config: {
            logLevel: 'info'
        }
    });
    console.log('CheckMgr initialized.');
    const generatedCheckImageUrl = await generateCheckImage();
     updateGeneratedCheckImage(generatedCheckImageUrl);
    attachEventListeners();
}

function updateGeneratedCheckImage(checkImageUrl: string) {
    const generatedCheckImage = document.getElementById('generatedCheckImage') as HTMLImageElement;
    generatedCheckImage.src = checkImageUrl;
    generatedCheckImageUrl = checkImageUrl;
}

function attachEventListeners() {
    const manualFileInput = document.getElementById('manualFileInput') as HTMLInputElement;
    const generatedProcessImageButton = document.getElementById('generatedProcessImageButton') as HTMLButtonElement;
    const manualProcessImageButton = document.getElementById('manualProcessImageButton') as HTMLButtonElement;
    manualProcessImageButton.addEventListener('click', processManualImage);
    generatedProcessImageButton.addEventListener('click', processGeneratedImage);

    function processManualImage() {
        processImage(document.getElementById('manualFileInput') as HTMLInputElement, {
            tesseract: {
                routingNumber: 'manualTesseractRoutingNumber',
                accountNumber: 'manualTesseractAccountNumber',
                checkNumber: 'manualTesseractCheckNumber'
            },
            opencv: {
                routingNumber: 'manualOpencvRoutingNumber',
                accountNumber: 'manualOpencvAccountNumber',
                checkNumber: 'manualOpencvCheckNumber'
            }
        });
    }

    async function processGeneratedImage() {
        const img = new Image();
        img.onload = async function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const mat = cv.matFromImageData(imageData!);

            try {
                const scanResults = await scanImage(checkMgr, mat);
                displayCheckDetails(scanResults, {
                    tesseract: {
                        routingNumber: 'generatedTesseractRoutingNumber',
                        accountNumber: 'generatedTesseractAccountNumber',
                        checkNumber: 'generatedTesseractCheckNumber'
                    },
                    opencv: {
                        routingNumber: 'generatedOpencvRoutingNumber',
                        accountNumber: 'generatedOpencvAccountNumber',
                        checkNumber: 'generatedOpencvCheckNumber'
                    }
                });
            } catch (error) {
                console.error('Error processing check details:', error);
            }
        };
        img.src = generatedCheckImageUrl;
    }
}

async function processImage(fileInput: HTMLInputElement, outputIds: { tesseract: { routingNumber: string, accountNumber: string, checkNumber: string }, opencv: { routingNumber: string, accountNumber: string, checkNumber: string } }) {
    const file = fileInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
        const img = new Image();
        img.onload = async function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            const mat = cv.matFromImageData(imageData!);

            try {
                const scanResults = await scanImage(checkMgr, mat);
                displayCheckDetails(scanResults, outputIds);
            } catch (error) {
                console.error('Error processing check details:', error);
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
}

function displayCheckDetails(scanResults: ScanResults, outputIds: { tesseract: { routingNumber: string, accountNumber: string, checkNumber: string }, opencv: { routingNumber: string, accountNumber: string, checkNumber: string } }) {
    if (scanResults.tesseract) {
        document.getElementById(outputIds.tesseract.routingNumber)!.textContent = scanResults.tesseract.routingNumber;
        document.getElementById(outputIds.tesseract.accountNumber)!.textContent = scanResults.tesseract.accountNumber;
        document.getElementById(outputIds.tesseract.checkNumber)!.textContent = scanResults.tesseract.checkNumber;
    }

    if (scanResults.opencv) {
        document.getElementById(outputIds.opencv.routingNumber)!.textContent = scanResults.opencv.routingNumber;
        document.getElementById(outputIds.opencv.accountNumber)!.textContent = scanResults.opencv.accountNumber;
        document.getElementById(outputIds.opencv.checkNumber)!.textContent = scanResults.opencv.checkNumber;
    }
}


//initializeAndStart();
initialize();
