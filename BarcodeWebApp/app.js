/*
 * Client‑side logic for the Price Scanner web application.
 *
 * This script uses Quagga2 to scan barcodes via the device camera
 * and stores price data in localStorage. It also registers a
 * service worker so that the app can run offline when installed
 * as a progressive web app (PWA). Upon loading, any previously
 * saved barcode/price pairs are displayed in the price list.
 */

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-scan');
  const scannerContainer = document.getElementById('scanner-container');
  const priceEntry = document.getElementById('price-entry');
  const scannedCodeSpan = document.getElementById('scanned-code');
  const priceInput = document.getElementById('price-input');
  const savePriceBtn = document.getElementById('save-price');
  const pricesList = document.getElementById('prices');

  let currentCode = null;

  /**
   * Load saved prices from localStorage and render them in the UI.
   */
  function loadPrices() {
    const data = JSON.parse(localStorage.getItem('prices') || '{}');
    pricesList.innerHTML = '';
    Object.keys(data).forEach(code => {
      const li = document.createElement('li');
      const codeSpan = document.createElement('span');
      codeSpan.textContent = code;
      const priceSpan = document.createElement('span');
      priceSpan.classList.add('price');
      priceSpan.textContent = `$${data[code].toFixed(2)}`;
      li.appendChild(codeSpan);
      li.appendChild(priceSpan);
      pricesList.appendChild(li);
    });
  }

  /**
   * Start the barcode scanner using Quagga2. This will prompt the user
   * for camera permissions and render the video stream into
   * scannerContainer. When a code is detected, onDetected is called.
   */
  function startScanner() {
    // Clear any previous scanner output and hide the price entry form
    priceEntry.classList.add('hidden');
    scannerContainer.innerHTML = '';

    // Configure Quagga2 for common 1D retail barcode formats. Quagga2
    // supports UPC, EAN, Code 128 and Code 39 among others. The live
    // stream will use the device's rear camera (facingMode: environment).
    const config = {
      inputStream: {
        type: 'LiveStream',
        constraints: {
          facingMode: 'environment'
        },
        target: scannerContainer
      },
      locator: {
        patchSize: 'medium',
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 2,
      decoder: {
        readers: [
          'upc_reader',
          'upc_e_reader',
          'ean_reader',
          'ean_8_reader',
          'code_128_reader',
          'code_39_reader'
        ]
      },
      locate: true
    };

    Quagga.init(config, err => {
      if (err) {
        console.error('Failed to initialize Quagga:', err);
        alert('Unable to start barcode scanner. Please check camera permissions.');
        return;
      }
      Quagga.start();
    });
    Quagga.onDetected(onDetected);
  }

  /**
   * Callback invoked whenever Quagga2 detects a barcode. Stops scanning
   * and displays the price entry form for the scanned code.
   *
   * @param {object} result The detection result from Quagga2
   */
  function onDetected(result) {
    const code = result && result.codeResult && result.codeResult.code;
    if (!code) {
      return;
    }
    // Stop scanning to prevent multiple detections
    Quagga.offDetected(onDetected);
    Quagga.stop();

    currentCode = code;
    scannerContainer.innerHTML = '';
    scannedCodeSpan.textContent = code;
    priceInput.value = '';
    priceEntry.classList.remove('hidden');
  }

  // Bind event listeners
  startBtn.addEventListener('click', startScanner);
  savePriceBtn.addEventListener('click', () => {
    const price = parseFloat(priceInput.value);
    if (!currentCode || isNaN(price)) {
      // Do nothing if the code or price is invalid
      return;
    }
    const data = JSON.parse(localStorage.getItem('prices') || '{}');
    data[currentCode] = price;
    localStorage.setItem('prices', JSON.stringify(data));
    loadPrices();
    // Reset UI state
    priceEntry.classList.add('hidden');
    currentCode = null;
  });

  // Load existing prices on startup
  loadPrices();

  // Register the service worker if supported
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('service-worker.js')
        .catch(err => console.error('Service worker registration failed:', err));
    });
  }
});