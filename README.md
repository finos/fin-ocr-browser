# FIN-OCR Browser-Based Demo Application

> NOTE: This project is a WORK-IN-PROGRESS.

This project contains a browser-based application demonstrating how to use [fin-ocr-sdk](https://github.com/discoverfinancial/fin-ocr-sdk). The application performs OCR (Optical Character Recognition) on data received from a video capture device (e.g., your device's webcam).

## Features
This demo application allows you to:
- **Manual OCR Processing:** Perform OCR on any check image manually using the SDK [fin-ocr-sdk](https://github.com/discoverfinancial/fin-ocr-sdk), allowing a way to quickly test and validate OCR capabilities
- **Check Scanner Simulation:** Capture video input from your device's webcam, simulating the behavior of a check scanner in banking apps. The application detects the presence of a check in the camera feed and performs OCR on the relevant portions of the check.

## Prerequisites

Ensure you have the following installed on your system:

- Git
- [Node.js](https://nodejs.org/) (v20.x or higher, which includes npm)
- npm (comes with Node.js)

## Installation Steps

### 1. Clone the SDK and Demo Repositories
Clone both the SDK and the demo application repositories:

```bash
git clone https://github.com/discoverfinancial/fin-ocr-sdk.git
git clone https://github.com/discoverfinancial/fin-ocr-browser-demo.git
```

### 2. Build and Link the SDK
Navigate to the SDK directory, install dependencies, build it, and link it globally:

```bash
cd fin-ocr-sdk
npm run build
npm link
```
### 3. Install Dependencies and Build the Demo Application
Next, navigate to the fin-ocr-browser-demo directory and run the following commands to install the necessary dependencies and build the project:

```bash
cd ../fin-ocr-browser-demo
npm link @discoverfinancial/fin-ocr-sdk
npm run build
```

## Running the Application Locally
To start the application:
```bash
npm run dev
```
Then open the application in your browser on the indicated port, which is http://localhost:5173 by default.
