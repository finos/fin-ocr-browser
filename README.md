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

### 1. Clone the SDK and Demo Repositories
Clone both the SDK and the demo application repositories:

```bash
git clone https://github.com/finos/fin-ocr-sdk.git
git clone https://github.com/finos/fin-ocr-browser.git
```

### 2. Build and Link the SDK
Navigate to the SDK directory, install dependencies, build it, and link it globally:

```bash
cd fin-ocr-sdk
npm run build
npm link
```
<details>
<summary><strong>Note for users with restricted npm global path</strong></summary>

If the normal global path for npm is restricted on your corporate machine, you can still use `npm link` by following these steps:

### For Unix-like Systems (Linux/macOS):

1. **Set up a local npm prefix:**
   - Configure npm to use a local directory for global installations. This allows you to use `npm link` without requiring access to the restricted global path.
   - Run the following command:
     ```bash
     npm config set prefix ~/.npm-global
     ```
   - This changes the global installation directory to `~/.npm-global`, which should be accessible even with corporate restrictions.

2. **Add the new npm global directory to your PATH:**
   - Add the following line to your `.bashrc`, `.zshrc`, or corresponding shell configuration file:
     ```bash
     export PATH=~/.npm-global/bin:$PATH
     ```
   - Then, source the file to update your current shell session:
     ```bash
     source ~/.bashrc  # or source ~/.zshrc
     ```

3. **Use `npm link` as usual:**

### For Windows Users:

1. **Set up a local npm prefix:**
   - Configure npm to use a local directory for global installations by running the following command in your terminal (Command Prompt or PowerShell):
     ```bash
     npm config set prefix "%USERPROFILE%\npm-global"
     ```
   - This changes the global installation directory to `%USERPROFILE%\npm-global`, which is within your user profile and should be accessible despite corporate restrictions.

2. **Add the new npm global directory to your PATH:**
   - Open the Environment Variables settings in Windows.
   - Add `%USERPROFILE%\npm-global\bin` to your `PATH` variable.

3. **Use `npm link` as usual:**

</details>

### 3. Install Dependencies and Build the Demo Application
Next, navigate to the fin-ocr-browser directory and run the following commands to install the necessary dependencies and build the project:

```bash
cd ../fin-ocr-browser
npm link @finos/fin-ocr-sdk
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
