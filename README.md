[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://community.finos.org/docs/governance/Software-Projects/stages/incubating) [![Contributors-Invited](https://img.shields.io/badge/Contributors-Wanted-blue)](./CONTRIBUTE.md)
# FIN-OCR Browser-Based Demo Application

> NOTE: This project is a WORK-IN-PROGRESS.

This project contains a browser-based application demonstrating how to use [fin-ocr-sdk](https://github.com/discoverfinancial/fin-ocr-sdk). The application performs OCR (Optical Character Recognition) on data received from a video capture device (e.g., your device's webcam).

## Features
This demo application includes two demos:
- **Check Image OCR Analysis:** Upload a check image directly to extract MICR data using the [fin-ocr-sdk](https://github.com/discoverfinancial/fin-ocr-sdk). This process runs in the browser, so your image data will remain on your device.
- **Analyze Generated Check Image:** Generate a simulated check image and run OCR to extract critical MICR data.
<!--- **Check Scanner Simulation:** Capture video input from your device's webcam, simulating the behavior of a check scanner in banking apps. The application detects the presence of a check in the camera feed and performs OCR on the relevant portions of the check.
-->

## Prerequisites

Ensure you have the following installed on your system:

- Git
- [Node.js](https://nodejs.org/) (v20.x or higher, which includes npm)
- npm (comes with Node.js)

## Installation Steps

### 1. Clone the Demo Repository
Clone both the SDK and the demo application repositories:

```bash
git clone https://github.com/finos/fin-ocr-browser.git
```

### 2. Install Dependencies and Build the Demo Application
Next, navigate to the fin-ocr-browser directory and run the following commands to install the necessary dependencies and build the project:

```bash
cd fin-ocr-browser
npm run build
```

## Running the Application Locally
To start the application:
```bash
npm run dev
```
Then open the application in your browser on the indicated port, which is http://localhost:5173 by default.

## Roadmap

TBD

## Contributing

This document provides guidance for how YOU can collaborate with our project community to improve this technology.

[FIN-OCR Contribution](https://github.com/finos/fin-ocr/blob/main/CONTRIBUTE.md)

## Scans
### Vulnerability Report

To generate a report containing any vulnerabilities in any dependency please use:

```bash
$npm run scan
```

### License Report

```bash
npm run scan-license
```

**Note:** Each of these scans should be run and problems addressed by a developer prior to submitting code that uses new packages.

## License

Copyright 2024 Capital One

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
