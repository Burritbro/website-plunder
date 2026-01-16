/**
 * Website Plunder - Frontend Application
 *
 * Handles user interaction and communication with the backend /replicate endpoint
 */

// DOM elements
const urlInput = document.getElementById('url-input');
const replicateBtn = document.getElementById('replicate-btn');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const progressDetails = document.getElementById('progress-details');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const resultsContainer = document.getElementById('results-container');
const statsDiv = document.getElementById('stats');
const viewBtn = document.getElementById('view-btn');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const replicaModal = document.getElementById('replica-modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeModal = document.getElementById('close-modal');
const replicaFrame = document.getElementById('replica-frame');

// State
let replicatedHTML = null;

/**
 * Initialize event listeners
 */
function init() {
  replicateBtn.addEventListener('click', handleReplicate);
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleReplicate();
    }
  });

  viewBtn.addEventListener('click', showReplicaModal);
  downloadBtn.addEventListener('click', downloadReplica);
  resetBtn.addEventListener('click', reset);
  closeModal.addEventListener('click', hideReplicaModal);
  modalOverlay.addEventListener('click', hideReplicaModal);

  // Focus input on load
  urlInput.focus();
}

/**
 * Handle the main replication process
 */
async function handleReplicate() {
  const url = urlInput.value.trim();

  // Validate URL
  if (!url) {
    showError('Please enter a URL');
    return;
  }

  // Basic URL validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showError('URL must start with http:// or https://');
    return;
  }

  // Reset UI
  hideError();
  hideResults();
  showStatus('Preparing to plunder the site...');
  disableInput();

  try {
    // Make request to backend
    updateStatus('Fetching website content...', 'This may take a moment');

    const response = await fetch('/replicate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to replicate website');
    }

    // Success!
    replicatedHTML = data.html;

    updateStatus('Replication complete!', '');
    hideStatus();
    showResults(data.stats);

  } catch (error) {
    hideStatus();
    showError(error.message || 'Failed to replicate website');
    enableInput();
  }
}

/**
 * Show status message
 */
function showStatus(message, details = '') {
  statusText.textContent = message;
  progressDetails.textContent = details;
  statusContainer.classList.remove('hidden');
}

/**
 * Update status message
 */
function updateStatus(message, details = '') {
  statusText.textContent = message;
  progressDetails.textContent = details;
}

/**
 * Hide status message
 */
function hideStatus() {
  statusContainer.classList.add('hidden');
}

/**
 * Show error message
 */
function showError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
  errorContainer.classList.add('hidden');
}

/**
 * Show results
 */
function showResults(stats) {
  if (stats) {
    const imagePercent = stats.totalImages > 0
      ? Math.round((stats.images / stats.totalImages) * 100)
      : 100;

    statsDiv.innerHTML = `
      Images: ${stats.images}/${stats.totalImages} (${imagePercent}%) •
      Stylesheets: ${stats.stylesheets}
    `;
  }

  resultsContainer.classList.remove('hidden');
}

/**
 * Hide results
 */
function hideResults() {
  resultsContainer.classList.add('hidden');
}

/**
 * Disable input during processing
 */
function disableInput() {
  urlInput.disabled = true;
  replicateBtn.disabled = true;
}

/**
 * Enable input after processing
 */
function enableInput() {
  urlInput.disabled = false;
  replicateBtn.disabled = false;
}

/**
 * Show replica in modal
 */
function showReplicaModal() {
  if (!replicatedHTML) {
    showError('No replica available');
    return;
  }

  // Use srcdoc to load the HTML safely
  replicaFrame.srcdoc = replicatedHTML;
  replicaModal.classList.remove('hidden');
}

/**
 * Hide replica modal
 */
function hideReplicaModal() {
  replicaModal.classList.add('hidden');
  replicaFrame.srcdoc = '';
}

/**
 * Download replica as HTML file
 */
function downloadReplica() {
  if (!replicatedHTML) {
    showError('No replica available');
    return;
  }

  // Create a blob and download it
  const blob = new Blob([replicatedHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  // Generate filename from original URL
  const urlValue = urlInput.value.trim();
  const filename = generateFilename(urlValue);

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename from URL
 */
function generateFilename(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/[^a-z0-9]/gi, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    return `plunder-${hostname}-${timestamp}.html`;
  } catch (error) {
    return `plunder-${Date.now()}.html`;
  }
}

/**
 * Reset the application
 */
function reset() {
  urlInput.value = '';
  replicatedHTML = null;
  hideStatus();
  hideError();
  hideResults();
  hideReplicaModal();
  enableInput();
  urlInput.focus();
}

// Initialize the application
init();
