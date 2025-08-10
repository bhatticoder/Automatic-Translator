// ==================== ELEMENT REFERENCES ====================
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const fromLang = document.getElementById('fromLang');
const toLang = document.getElementById('toLang');
const swapBtn = document.getElementById('swapBtn');
const clearTextBtn = document.getElementById('clearTextBtn');
const copyTextBtn = document.getElementById('translateTextBtn');
const fileUpload = document.getElementById("fileUpload");
const fileTargetLang = document.getElementById("fileTargetLang");
const translateFileBtn = document.getElementById("translateFileBtn");
const clearFileBtn = document.getElementById("clearFileBtn");
const translatedBox = document.getElementById("translatedText");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const downloadDocxBtn = document.getElementById("downloadDocxBtn");
const loadingDiv = document.getElementById("loading");
const micBtn = document.getElementById("micBtn");

let debounceTimer;
let recognition;
let recognizing = false;

// ==================== LOAD LANGUAGES ====================
async function loadLanguages() {
    try {
        const response = await fetch(`${window.location.origin}/languages`);
        const languages = await response.json();

        fromLang.innerHTML = `<option value="auto">Auto Detect</option>`;
        toLang.innerHTML = '';
        fileTargetLang.innerHTML = '';

        languages.forEach(lang => {
            const option = new Option(lang.name, lang.language);
            fromLang.appendChild(option.cloneNode(true));
            toLang.appendChild(option.cloneNode(true));
            fileTargetLang.appendChild(option.cloneNode(true));
        });

        fromLang.value = "en";
        toLang.value = "ur";
    } catch (error) {
        console.error("Failed to load languages:", error);
        Swal.fire({
            title: '🔌 Language Load Error',
            text: 'Unable to fetch language list. Please try again later.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

// ==================== TRANSLATE TEXT ====================
async function translateText() {
    const text = inputText.value.trim();
    const source = fromLang.value;
    const target = toLang.value;
    if (!text) {
        outputText.value = '';
        return;
    }
    try {
        const response = await fetch(`${window.location.origin}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, src_lang: source, tgt_lang: target })
        });
        const data = await response.json();
        outputText.value = data.translation || "Translation failed.";
    } catch (err) {
        console.error('Translation error:', err);
        outputText.value = "Server error.";
    }
}

// ==================== TRANSLATE FILE ====================
function detectFileLanguage() {
    translatedBox.value = "";
    downloadPdfBtn.style.display = "none";
    downloadDocxBtn.style.display = "none";
}

async function translateFile() {
    if (!fileUpload.files.length) {
        Swal.fire({
            title: '📄 No File Uploaded',
            text: 'Please select a PDF or Word file to translate.',
            icon: 'warning',
            confirmButtonText: 'Okay',
        });
        return;
    }

    loadingDiv.style.display = "block";
    translatedBox.value = "";

    const formData = new FormData();
    formData.append("file", fileUpload.files[0]);
    formData.append("fileTargetLang", fileTargetLang.value);

    try {
        const response = await fetch("/translate_file", { method: "POST", body: formData });
        const result = await response.json();
        translatedBox.value = result.translation || "No translation found.";

        if (result.translation) {
            downloadPdfBtn.style.display = "inline-block";
            downloadPdfBtn.href = "/download_pdf?text=" + encodeURIComponent(result.translation);
            downloadDocxBtn.style.display = "inline-block";
            downloadDocxBtn.href = "/download_docx?text=" + encodeURIComponent(result.translation);
        } else {
            downloadPdfBtn.style.display = "none";
            downloadDocxBtn.style.display = "none";
        }
    } catch (err) {
        console.error("File translation error:", err);
        Swal.fire({
            title: '❌ Error',
            text: 'File translation failed. Please try again.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    } finally {
        loadingDiv.style.display = "none";
    }
}

// ==================== CLIPBOARD & CLEARING ====================
async function copyInputText() {
    try {
        await navigator.clipboard.writeText(inputText.value);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Text has been copied to clipboard.',
            timer: 1500,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Failed to copy',
            text: err.toString()
        });
    }
}

function clearTextFields() {
    inputText.value = "";
    outputText.value = "";
}

function clearFileFields() {
    fileUpload.value = "";
    translatedBox.value = "";
    downloadPdfBtn.style.display = "none";
    downloadDocxBtn.style.display = "none";
}

// ==================== VOICE INPUT ====================
function initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        Swal.fire({
            icon: 'error',
            title: 'Speech Recognition Not Supported',
            text: 'Your browser does not support speech recognition. Please use Chrome or Edge.',
        });
        micBtn.disabled = true;
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = fromLang.value !== "auto" ? fromLang.value : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        recognizing = true;
        micBtn.textContent = '🛑';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        Swal.fire({
            icon: 'error',
            title: 'Speech Recognition Error',
            text: event.error,
        });
        recognizing = false;
        micBtn.textContent = '🎤';
    };

    recognition.onend = () => {
        recognizing = false;
        micBtn.textContent = '🎤';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inputText.value += (inputText.value ? ' ' : '') + transcript;
        translateText();
    };
}

function toggleSpeechRecognition() {
    if (recognizing) {
        recognition.stop();
    } else {
        recognition.lang = fromLang.value !== "auto" ? fromLang.value : 'en-US';
        recognition.start();
    }
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', async () => {
    await loadLanguages();

    inputText.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(translateText, 500);
    });
    fromLang.addEventListener('change', translateText);
    toLang.addEventListener('change', translateText);
    swapBtn.addEventListener('click', () => {
        const temp = fromLang.value;
        fromLang.value = toLang.value;
        toLang.value = temp;
        translateText();
    });
    clearTextBtn.addEventListener('click', clearTextFields);
    copyTextBtn.addEventListener('click', copyInputText);
    translateFileBtn.addEventListener("click", translateFile);
    fileUpload.addEventListener("change", detectFileLanguage);
    clearFileBtn.addEventListener("click", clearFileFields);
    initSpeechRecognition();
    micBtn.addEventListener('click', toggleSpeechRecognition);
});
