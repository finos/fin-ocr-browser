/**
 * Copyright (c) 2024 Discover Financial Services
*/
import * as ocr from "@discoverfinancial/fin-ocr-sdk";
import { encode, decode } from 'base64-arraybuffer-es6';

interface VideoConstraintSetting {
    exact: number;
}

interface VideoConstraint {
    width: VideoConstraintSetting;
    height: VideoConstraintSetting;
}

type VideoConstraints = {[name: string]: VideoConstraint | boolean};

type OnCameraStartedCallback = (stream: any, video: any) => Promise<void>;

const IS_BROWSER = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const defaultPlatform: ocr.Platform = {
    base64: {
       encode: encode,
       decode: decode,
    }
};

class BrowserOCR {

    private readonly ocr: ocr.OCR;
    private readonly ocrInput: HTMLVideoElement;
    private readonly ocrOutput: HTMLCanvasElement;
    private readonly errorMessage: HTMLElement;
    private readonly startAndStop: HTMLElement;
    private readonly canvasContext: CanvasRenderingContext2D;
    private readonly videoCapture: ocr.OCRVideoCapture;

    private onCameraStartedCallback: OnCameraStartedCallback | undefined;
    private stream: MediaStream | undefined;
    private onVideoStartedFcn: any;
    private onVideoCanPlayFcn: any;
    private videoCaptureCallbackFcn: any;
    private started = false;

    constructor(ocr: ocr.OCR) {
        const self = this;
        this.ocr = ocr;
        this.ocrInput = document.getElementById('ocrInput') as HTMLVideoElement;
        this.ocrOutput = document.getElementById('ocrOutput') as HTMLCanvasElement;
        this.errorMessage = document.getElementById('errorMessage') as HTMLElement;
        this.startAndStop = document.getElementById('startAndStop') as HTMLElement;
        this.canvasContext = this.ocrOutput.getContext('2d') as CanvasRenderingContext2D;
        this.onVideoStartedFcn = this.onVideoStarted.bind(this);
        this.onVideoCanPlayFcn = this.onVideoCanPlay.bind(this);
        this.videoCaptureCallbackFcn = this.videoCaptureCallback.bind(this);
        this.videoCapture = this.ocr.newVideoCapture(this.ocrInput.height, this.ocrInput.width, this.videoCaptureCallbackFcn, {videoSource: this.ocrInput});
        this.startAndStop.addEventListener('click', async () => await self.toggleStartStopButton());
    }

    private async videoCaptureCallback(img: ocr.Image): Promise<boolean> {
        console.log(`Video capture callback`);
       img = img.grayScale();
       img = img.deskew();
       img = img.bitwiseNot();
       //const lines = img.getLines();
       //img = img.drawLines(lines);
       cv.imshow(`ocrOutput`, img.mat);
       return true;
    }

    private async toggleStartStopButton() {
        if (!this.started) {
            this.clearError();
            this.startCamera('qvga', this.onVideoStartedFcn);
        } else {
            this.stopCamera();
            this.onVideoStopped();
        }
    }

    private startCamera(resolution: string, callback: OnCameraStartedCallback) {
        const self = this;
        console.log(`Starting camera`);
        const constraints: VideoConstraints = {
            'qvga': { width: { exact: 320 }, height: { exact: 240 } },
            'vga': { width: { exact: 640 }, height: { exact: 480 } }
        };
        let videoConstraint = constraints[resolution];
        if (!videoConstraint) {
            videoConstraint = true;
        }
        navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false })
            .then(function (stream: MediaStream) {
                self.ocrInput.srcObject = stream;
                self.ocrInput.play();
                self.stream = stream;
                self.onCameraStartedCallback = callback;
                self.ocrInput.addEventListener('canplay', self.onVideoCanPlayFcn, false);
            })
            .catch(function (err) {
                self.printError('Camera Error: ' + err.name + ' ' + err.message);
            });
    };

    private stopCamera() {
        console.log(`Stopping camera`);
        this.videoCapture.stop();
        this.ocrInput.pause();
        this.ocrInput.srcObject = null;
        this.ocrInput.removeEventListener('canplay', this.onVideoCanPlayFcn);
        if (this.stream) {
            this.stream.getVideoTracks()[0].stop();
        }
        console.log(`Stopped camera`);
    }

    private onVideoStarted() {
        console.log(`Video started`);
        this.started = true;
        this.startAndStop.innerText = 'Stop';
        this.ocrInput.width = this.ocrInput.offsetWidth;
        this.ocrInput.height = this.ocrInput.offsetHeight;
        this.videoCapture.start();
    }

    private onVideoStopped() {
        this.started = false;
        this.canvasContext.clearRect(0, 0, this.ocrOutput.width, this.ocrOutput.height);
        this.startAndStop.innerText = 'Start';
    }

    private onVideoCanPlay() {
        if (this.onCameraStartedCallback) {
            this.onCameraStartedCallback(this.stream, this.ocrInput);
        }
    }

    private clearError() {
        this.errorMessage.innerHTML = '';
    }

    public printError(err: any) {
        if (typeof err === 'undefined') {
            err = '';
        } else if (typeof err === 'number') {
            if (!isNaN(err)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
                }
            }
        } else if (typeof err === 'string') {
            let ptr = Number(err.split(' ')[0]);
            if (!isNaN(ptr)) {
                if (typeof cv !== 'undefined') {
                    err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
                }
            }
        } else if (err instanceof Error) {
            if (err.stack) err = err.stack.replace(/\n/g, '<br>');
        }
        this.errorMessage.innerHTML = err;
   }

}

async function main() {
    const myOCR = await ocr.OCR.new({
        config: {
            logLevel: "debug",
            translators: "opencv"
        },
        translators: {
            opencv: {
                refImage: "micr_ref.tif",
                format: ocr.ImageFormat.TIF,
                charDescriptors: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "T:3", "U:3", "A:3", "D:3"],
                correctionsDir: "corrections",
            },
        },
        platform: defaultPlatform
    });
    new BrowserOCR(myOCR);
}

main();
