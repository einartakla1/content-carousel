import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Sortable from 'sortablejs';
import { slideTemplates } from './slideTemplates.js';

// State
const STORAGE_KEY = 'carousel-editor-projects';

// Load from localStorage if available
function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const projects = JSON.parse(saved);
            return projects;
        }
    } catch (e) {
        console.warn('Could not load from localStorage:', e);
    }
    return {};
}

// Save to localStorage
function saveToStorage(projects) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

// Auto-save current project
function autoSave() {
    const projects = loadFromStorage();
    projects[carouselConfig.carouselId] = {
        config: carouselConfig,
        assets: Array.from(uploadedAssets.entries()),
        lastModified: new Date().toISOString()
    };
    saveToStorage(projects);

    // Show feedback
    const status = document.getElementById('autoSaveStatus');
    if (status) {
        status.textContent = '✓ Saved';
        setTimeout(() => {
            status.textContent = 'Auto-save enabled';
        }, 2000);
    }
}

let carouselConfig = {
    carouselId: generateId(),
    disclaimerText: 'ANNONSØRINNHOLD',
    customerName: '',
    autoRotate: false,
    autoRotateDelay: 4000,
    autoRotateSpeed: 1000,
    carouselHeight: 516,
    slideHeight: 340,
    slides: []
};

let uploadedAssets = new Map(); // Map to store uploaded files
let currentEditingSlideIndex = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEditor();
    setupEventListeners();

    // Wait a bit for iframe to be ready before first preview
    setTimeout(() => {
        updatePreview();
    }, 100);

    // Auto-save every 5 seconds
    setInterval(autoSave, 5000);
});

function generateId() {
    return Math.floor(Math.random() * 1000000000);
}

function initializeEditor() {
    document.getElementById('carouselId').value = carouselConfig.carouselId;
    document.getElementById('disclaimerText').value = carouselConfig.disclaimerText;
    document.getElementById('customerName').value = carouselConfig.customerName;
    document.getElementById('autoRotate').checked = carouselConfig.autoRotate;
    document.getElementById('autoRotateDelay').value = carouselConfig.autoRotateDelay;
    document.getElementById('autoRotateSpeed').value = carouselConfig.autoRotateSpeed;
    document.getElementById('carouselHeight').value = carouselConfig.carouselHeight;
    document.getElementById('slideHeight').value = carouselConfig.slideHeight;

    // Initialize slides list
    renderSlidesList();
}

function setupEventListeners() {
    // Global settings
    document.getElementById('disclaimerText').addEventListener('input', (e) => {
        carouselConfig.disclaimerText = e.target.value;
        updatePreview();
    });

    document.getElementById('customerName').addEventListener('input', (e) => {
        carouselConfig.customerName = e.target.value;
        updatePreview();
    });

    document.getElementById('autoRotate').addEventListener('change', (e) => {
        carouselConfig.autoRotate = e.target.checked;
        updatePreview();
    });

    document.getElementById('autoRotateDelay').addEventListener('input', (e) => {
        carouselConfig.autoRotateDelay = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('autoRotateSpeed').addEventListener('input', (e) => {
        carouselConfig.autoRotateSpeed = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('carouselHeight').addEventListener('input', (e) => {
        carouselConfig.carouselHeight = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slideHeight').addEventListener('input', (e) => {
        carouselConfig.slideHeight = parseInt(e.target.value);
        updatePreview();
    });

    // Add slide button
    document.getElementById('addSlideBtn').addEventListener('click', () => {
        document.getElementById('addSlideModal').classList.add('active');
    });

    // Cancel add slide
    document.getElementById('cancelAddSlide').addEventListener('click', () => {
        document.getElementById('addSlideModal').classList.remove('active');
    });

    // Slide type buttons
    document.querySelectorAll('.slide-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            addSlide(type);
            document.getElementById('addSlideModal').classList.remove('active');
        });
    });

    // Export button
    document.getElementById('exportBtn').addEventListener('click', exportToZip);

    // Load project button
    document.getElementById('loadProjectBtn').addEventListener('click', () => {
        showLoadProjectModal();
    });

    // Cancel load project
    document.getElementById('cancelLoadProject').addEventListener('click', () => {
        document.getElementById('loadProjectModal').classList.remove('active');
    });

    // Refresh preview button
    document.getElementById('refreshPreviewBtn').addEventListener('click', () => {
        updatePreview();
    });

    // Preview controls
    document.querySelectorAll('[data-preview]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-preview]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const frame = document.getElementById('previewFrame');
            frame.classList.remove('desktop', 'mobile');
            frame.classList.add(btn.dataset.preview);
        });
    });
}

function addSlide(type) {
    const template = slideTemplates[type];
    if (!template) return;

    const newSlide = JSON.parse(JSON.stringify(template));
    carouselConfig.slides.push(newSlide);

    renderSlidesList();
    updatePreview();

    // Select the newly added slide
    editSlide(carouselConfig.slides.length - 1);
}

function renderSlidesList() {
    const container = document.getElementById('slidesList');
    container.innerHTML = '';

    if (carouselConfig.slides.length === 0) {
        container.innerHTML = '<p class="help-text">No slides yet. Click "Add Slide" to begin.</p>';
        return;
    }

    carouselConfig.slides.forEach((slide, index) => {
        const item = document.createElement('div');
        item.className = 'slide-item';
        if (currentEditingSlideIndex === index) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="slide-item-header">
                <div>
                    <span class="drag-handle">â˜°</span>
                    <span class="slide-item-title">${slide.name || `Slide ${index + 1}`}</span>
                </div>
                <div class="slide-item-actions">
                    <button class="btn-secondary btn-small" onclick="window.editSlide(${index})">Edit</button>
                    <button class="btn-danger btn-small" onclick="window.deleteSlide(${index})">Delete</button>
                </div>
            </div>
            <div class="slide-item-type">${getSlideTypeName(slide.type)}</div>
        `;

        container.appendChild(item);
    });

    // Initialize sortable
    new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
            const item = carouselConfig.slides.splice(evt.oldIndex, 1)[0];
            carouselConfig.slides.splice(evt.newIndex, 0, item);

            // Update current editing index if needed
            if (currentEditingSlideIndex === evt.oldIndex) {
                currentEditingSlideIndex = evt.newIndex;
            } else if (currentEditingSlideIndex > evt.oldIndex && currentEditingSlideIndex <= evt.newIndex) {
                currentEditingSlideIndex--;
            } else if (currentEditingSlideIndex < evt.oldIndex && currentEditingSlideIndex >= evt.newIndex) {
                currentEditingSlideIndex++;
            }

            renderSlidesList();
            updatePreview();
        }
    });
}

function getSlideTypeName(type) {
    const names = {
        'fullImage': 'Full Image',
        'fullImageWithText': 'Image with Text',
        'text': 'Text Only',
        'video': 'Video',
        'fullVideoWithText': 'Video with Text',
        'bigNumber': 'Big Numbers',
        'imageSelector': 'Image Selector'
    };
    return names[type] || type;
}

window.editSlide = (index) => {
    currentEditingSlideIndex = index;
    renderSlidesList();
    renderSlideEditor(index);
};

window.deleteSlide = (index) => {
    if (confirm('Are you sure you want to delete this slide?')) {
        carouselConfig.slides.splice(index, 1);

        if (currentEditingSlideIndex === index) {
            currentEditingSlideIndex = null;
            document.getElementById('slideEditor').style.display = 'none';
        } else if (currentEditingSlideIndex > index) {
            currentEditingSlideIndex--;
        }

        renderSlidesList();
        updatePreview();
    }
};

function renderSlideEditor(index) {
    const slide = carouselConfig.slides[index];
    const editor = document.getElementById('slideEditor');
    const content = document.getElementById('slideEditorContent');

    editor.style.display = 'block';
    content.innerHTML = '';

    // Common fields
    const commonFields = `
        <div class="form-group">
            <label>Slide Name (internal use)</label>
            <input type="text" id="slide-name" value="${slide.name || ''}" placeholder="e.g., Hero Image, Product Shot">
            <p class="help-text">This helps you identify slides in the list</p>
        </div>
        <div class="form-group">
            <label>Size</label>
            <select id="slide-size">
                <option value="regular" ${slide.size === 'regular' ? 'selected' : ''}>Regular (340px)</option>
                <option value="double" ${slide.size === 'double' ? 'selected' : ''}>Double (680px)</option>
            </select>
        </div>
    `;

    content.innerHTML = commonFields;

    // Type-specific fields
    switch (slide.type) {
        case 'fullImage':
            renderFullImageEditor(content, slide, index);
            break;
        case 'fullImageWithText':
            renderFullImageWithTextEditor(content, slide, index);
            break;
        case 'text':
            renderTextEditor(content, slide, index);
            break;
        case 'video':
            renderVideoEditor(content, slide, index);
            break;
        case 'fullVideoWithText':
            renderFullVideoWithTextEditor(content, slide, index);
            break;
        case 'bigNumber':
            renderBigNumberEditor(content, slide, index);
            break;
        case 'imageSelector':
            renderImageSelectorEditor(content, slide, index);
            break;
    }

    // Add event listeners
    document.getElementById('slide-name').addEventListener('input', (e) => {
        slide.name = e.target.value;
        renderSlidesList(); // Update the slides list to show new name
    });

    document.getElementById('slide-size').addEventListener('change', (e) => {
        slide.size = e.target.value;
        updatePreview();
    });
}

function renderFullImageEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>Image</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-image">Choose Image</label>
                <input type="file" id="slide-${index}-image" accept="image/*">
                <span class="file-name" id="slide-${index}-image-name">${slide.src ? 'Image selected' : 'No file chosen'}</span>
            </div>
            ${slide.src ? `<div class="file-preview"><img src="${slide.src}" alt="Preview"></div>` : ''}
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the image">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="slide-useZoom" ${slide.useZoom ? 'checked' : ''}>
                Use Ken Burns zoom effect
            </label>
        </div>
        <div class="form-group">
            <label>Link URL (optional)</label>
            <input type="url" id="slide-link" value="${slide.link || ''}" placeholder="https://example.com">
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById(`slide-${index}-image`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.src = dataUrl;
            slide.srcFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    document.getElementById('slide-useZoom').addEventListener('change', (e) => {
        slide.useZoom = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-link').addEventListener('input', (e) => {
        slide.link = e.target.value;
        updatePreview();
    });

    setupButtonEditorListeners(slide, index);
}

function renderFullImageWithTextEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>Image</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-image">Choose Image</label>
                <input type="file" id="slide-${index}-image" accept="image/*">
                <span class="file-name" id="slide-${index}-image-name">${slide.src ? 'Image selected' : 'No file chosen'}</span>
            </div>
            ${slide.src ? `<div class="file-preview"><img src="${slide.src}" alt="Preview"></div>` : ''}
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the image">
        </div>
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="slide-title" value="${slide.title || ''}" placeholder="Slide title">
        </div>
        <div class="form-group">
            <label>Text</label>
            <textarea id="slide-text">${slide.text || ''}</textarea>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header" onclick="this.parentElement.classList.toggle('active')">
                <span>Text Styling</span>
                <span class="collapsible-icon">â–¶</span>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>Text Position</label>
                    <select id="slide-textPosition">
                        <option value="top" ${slide.textPosition === 'top' ? 'selected' : ''}>Top</option>
                        <option value="bottom" ${slide.textPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Text Width</label>
                    <input type="text" id="slide-textWidth" value="${slide.textWidth || '100%'}" placeholder="e.g., 70%, 300px">
                </div>
                <div class="form-group">
                    <label>Text Color</label>
                    <input type="color" id="slide-textColor" value="${slide.textColor || '#ffffff'}">
                </div>
                <div class="form-group">
                    <label>Title Font Size (px)</label>
                    <input type="number" id="slide-titleFontSize" value="${slide.titleFontSize || 24}" min="12" max="48">
                </div>
                <div class="form-group">
                    <label>Text Font Size (px)</label>
                    <input type="number" id="slide-textFontSize" value="${slide.textFontSize || 14}" min="10" max="32">
                </div>
            </div>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header" onclick="this.parentElement.classList.toggle('active')">
                <span>Gradient Overlay</span>
                <span class="collapsible-icon">â–¶</span>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="slide-useGradient" ${slide.useGradient ? 'checked' : ''}>
                        Use gradient overlay
                    </label>
                </div>
                <div class="form-group">
                    <label>Gradient Color</label>
                    <input type="color" id="slide-gradientColor" value="${slide.gradientColor || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Gradient Height</label>
                    <input type="text" id="slide-gradientHeight" value="${slide.gradientHeight || '50%'}" placeholder="e.g., 50%, 200px">
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="slide-useZoom" ${slide.useZoom ? 'checked' : ''}>
                Use Ken Burns zoom effect
            </label>
        </div>
        <div class="form-group">
            <label>Link URL (optional)</label>
            <input type="url" id="slide-link" value="${slide.link || ''}" placeholder="https://example.com">
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById(`slide-${index}-image`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.src = dataUrl;
            slide.srcFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    document.getElementById('slide-title').addEventListener('input', (e) => {
        slide.title = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-text').addEventListener('input', (e) => {
        slide.text = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textPosition').addEventListener('change', (e) => {
        slide.textPosition = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textWidth').addEventListener('input', (e) => {
        slide.textWidth = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textColor').addEventListener('input', (e) => {
        slide.textColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-titleFontSize').addEventListener('input', (e) => {
        slide.titleFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-textFontSize').addEventListener('input', (e) => {
        slide.textFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-useGradient').addEventListener('change', (e) => {
        slide.useGradient = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-gradientColor').addEventListener('input', (e) => {
        slide.gradientColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-gradientHeight').addEventListener('input', (e) => {
        slide.gradientHeight = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-useZoom').addEventListener('change', (e) => {
        slide.useZoom = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-link').addEventListener('input', (e) => {
        slide.link = e.target.value;
        updatePreview();
    });

    setupButtonEditorListeners(slide, index);
}

function renderTextEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="slide-title" value="${slide.title || ''}" placeholder="Slide title">
        </div>
        <div class="form-group">
            <label>Text</label>
            <textarea id="slide-text">${slide.text || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="slide-backgroundColor" value="${slide.backgroundColor || '#ffffff'}">
        </div>
        <div class="form-group">
            <label>Title Color</label>
            <input type="color" id="slide-titleColor" value="${slide.titleColor || '#13264A'}">
        </div>
        <div class="form-group">
            <label>Text Color</label>
            <input type="color" id="slide-textColor" value="${slide.textColor || '#333333'}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Title Font Size (px)</label>
                <input type="number" id="slide-titleFontSize" value="${slide.titleFontSize || 22}" min="12" max="48">
            </div>
            <div class="form-group">
                <label>Text Font Size (px)</label>
                <input type="number" id="slide-textFontSize" value="${slide.textFontSize || 16}" min="10" max="32">
            </div>
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById('slide-title').addEventListener('input', (e) => {
        slide.title = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-text').addEventListener('input', (e) => {
        slide.text = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-backgroundColor').addEventListener('input', (e) => {
        slide.backgroundColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-titleColor').addEventListener('input', (e) => {
        slide.titleColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textColor').addEventListener('input', (e) => {
        slide.textColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-titleFontSize').addEventListener('input', (e) => {
        slide.titleFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-textFontSize').addEventListener('input', (e) => {
        slide.textFontSize = parseInt(e.target.value);
        updatePreview();
    });

    setupButtonEditorListeners(slide, index);
}

function renderVideoEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>Video File</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-video">Choose Video</label>
                <input type="file" id="slide-${index}-video" accept="video/*">
                <span class="file-name" id="slide-${index}-video-name">${slide.src ? 'Video selected' : 'No file chosen'}</span>
            </div>
            ${slide.src ? `<div class="file-preview"><video src="${slide.src}" controls style="max-width: 100%;"></video></div>` : ''}
        </div>
        <div class="form-group">
            <label>Poster Image (optional)</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-poster">Choose Poster</label>
                <input type="file" id="slide-${index}-poster" accept="image/*">
                <span class="file-name" id="slide-${index}-poster-name">${slide.posterSrc ? 'Poster selected' : 'No file chosen'}</span>
            </div>
            ${slide.posterSrc ? `<div class="file-preview"><img src="${slide.posterSrc}" alt="Poster preview"></div>` : ''}
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the video">
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById(`slide-${index}-video`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.src = dataUrl;
            slide.srcFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById(`slide-${index}-poster`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.posterSrc = dataUrl;
            slide.posterFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    setupButtonEditorListeners(slide, index);
}

function renderFullVideoWithTextEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>Video File</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-video">Choose Video</label>
                <input type="file" id="slide-${index}-video" accept="video/*">
                <span class="file-name" id="slide-${index}-video-name">${slide.src ? 'Video selected' : 'No file chosen'}</span>
            </div>
            ${slide.src ? `<div class="file-preview"><video src="${slide.src}" controls style="max-width: 100%;"></video></div>` : ''}
        </div>
        <div class="form-group">
            <label>Poster Image (optional)</label>
            <div class="file-upload">
                <label class="file-upload-btn" for="slide-${index}-poster">Choose Poster</label>
                <input type="file" id="slide-${index}-poster" accept="image/*">
                <span class="file-name" id="slide-${index}-poster-name">${slide.posterSrc ? 'Poster selected' : 'No file chosen'}</span>
            </div>
            ${slide.posterSrc ? `<div class="file-preview"><img src="${slide.posterSrc}" alt="Poster preview"></div>` : ''}
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the video">
        </div>
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="slide-title" value="${slide.title || ''}" placeholder="Slide title">
        </div>
        <div class="form-group">
            <label>Text</label>
            <textarea id="slide-text">${slide.text || ''}</textarea>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header" onclick="this.parentElement.classList.toggle('active')">
                <span>Text Styling</span>
                <span class="collapsible-icon">â–¶</span>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>Text Position</label>
                    <select id="slide-textPosition">
                        <option value="top" ${slide.textPosition === 'top' ? 'selected' : ''}>Top</option>
                        <option value="bottom" ${slide.textPosition === 'bottom' ? 'selected' : ''}>Bottom</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Text Width</label>
                    <input type="text" id="slide-textWidth" value="${slide.textWidth || '100%'}" placeholder="e.g., 70%, 300px">
                </div>
                <div class="form-group">
                    <label>Text Color</label>
                    <input type="color" id="slide-textColor" value="${slide.textColor || '#ffffff'}">
                </div>
                <div class="form-group">
                    <label>Title Font Size (px)</label>
                    <input type="number" id="slide-titleFontSize" value="${slide.titleFontSize || 24}" min="12" max="48">
                </div>
                <div class="form-group">
                    <label>Text Font Size (px)</label>
                    <input type="number" id="slide-textFontSize" value="${slide.textFontSize || 14}" min="10" max="32">
                </div>
            </div>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header" onclick="this.parentElement.classList.toggle('active')">
                <span>Gradient Overlay</span>
                <span class="collapsible-icon">â–¶</span>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="slide-useGradient" ${slide.useGradient ? 'checked' : ''}>
                        Use gradient overlay
                    </label>
                </div>
                <div class="form-group">
                    <label>Gradient Color</label>
                    <input type="color" id="slide-gradientColor" value="${slide.gradientColor || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Gradient Height</label>
                    <input type="text" id="slide-gradientHeight" value="${slide.gradientHeight || '50%'}" placeholder="e.g., 50%, 200px">
                </div>
            </div>
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById(`slide-${index}-video`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.src = dataUrl;
            slide.srcFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById(`slide-${index}-poster`).addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0], (dataUrl, filename) => {
            slide.posterSrc = dataUrl;
            slide.posterFilename = filename;
            renderSlideEditor(index);
            updatePreview();
        });
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    document.getElementById('slide-title').addEventListener('input', (e) => {
        slide.title = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-text').addEventListener('input', (e) => {
        slide.text = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textPosition').addEventListener('change', (e) => {
        slide.textPosition = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textWidth').addEventListener('input', (e) => {
        slide.textWidth = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textColor').addEventListener('input', (e) => {
        slide.textColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-titleFontSize').addEventListener('input', (e) => {
        slide.titleFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-textFontSize').addEventListener('input', (e) => {
        slide.textFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-useGradient').addEventListener('change', (e) => {
        slide.useGradient = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-gradientColor').addEventListener('input', (e) => {
        slide.gradientColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-gradientHeight').addEventListener('input', (e) => {
        slide.gradientHeight = e.target.value;
        updatePreview();
    });

    setupButtonEditorListeners(slide, index);
}

function renderBigNumberEditor(container, slide, index) {
    const html = `
        <div class="form-group">
            <label>First Number</label>
            <input type="text" id="slide-numberOne" value="${slide.numberOne || ''}" placeholder="e.g., 85%">
        </div>
        <div class="form-group">
            <label>First Text</label>
            <textarea id="slide-textOne">${slide.textOne || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Second Number</label>
            <input type="text" id="slide-numberTwo" value="${slide.numberTwo || ''}" placeholder="e.g., 42">
        </div>
        <div class="form-group">
            <label>Second Text</label>
            <textarea id="slide-textTwo">${slide.textTwo || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="slide-backgroundColor" value="${slide.backgroundColor || '#ffffff'}">
        </div>
        <div class="form-group">
            <label>Number Color</label>
            <input type="color" id="slide-numberColor" value="${slide.numberColor || '#13264A'}">
        </div>
        <div class="form-group">
            <label>Text Color</label>
            <input type="color" id="slide-textColor" value="${slide.textColor || '#333333'}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Number Font Size (px)</label>
                <input type="number" id="slide-numberFontSize" value="${slide.numberFontSize || 40}" min="20" max="80">
            </div>
            <div class="form-group">
                <label>Text Font Size (px)</label>
                <input type="number" id="slide-textFontSize" value="${slide.textFontSize || 16}" min="10" max="32">
            </div>
        </div>
        ${renderButtonEditor(slide, index)}
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById('slide-numberOne').addEventListener('input', (e) => {
        slide.numberOne = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textOne').addEventListener('input', (e) => {
        slide.textOne = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-numberTwo').addEventListener('input', (e) => {
        slide.numberTwo = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textTwo').addEventListener('input', (e) => {
        slide.textTwo = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-backgroundColor').addEventListener('input', (e) => {
        slide.backgroundColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-numberColor').addEventListener('input', (e) => {
        slide.numberColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textColor').addEventListener('input', (e) => {
        slide.textColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-numberFontSize').addEventListener('input', (e) => {
        slide.numberFontSize = parseInt(e.target.value);
        updatePreview();
    });

    document.getElementById('slide-textFontSize').addEventListener('input', (e) => {
        slide.textFontSize = parseInt(e.target.value);
        updatePreview();
    });

    setupButtonEditorListeners(slide, index);
}

function renderImageSelectorEditor(container, slide, index) {
    if (!slide.images) slide.images = [];

    const html = `
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="slide-backgroundColor" value="${slide.backgroundColor || '#EFF2F7'}">
        </div>
        <div class="form-group">
            <label>Image Width</label>
            <input type="text" id="slide-imageWidth" value="${slide.imageWidth || '60%'}" placeholder="e.g., 60%, 200px">
        </div>
        <div class="form-group">
            <label>Text Color</label>
            <input type="color" id="slide-textColor" value="${slide.textColor || '#333333'}">
        </div>
        <div class="form-group">
            <label>Dot Color (inactive)</label>
            <input type="color" id="slide-dotColor" value="${slide.dotColor || '#cccccc'}">
        </div>
        <div class="form-group">
            <label>Dot Color (active)</label>
            <input type="color" id="slide-dotActiveColor" value="${slide.dotActiveColor || '#13264A'}">
        </div>
        <div class="form-group">
            <label>Images</label>
            <button class="btn-secondary" id="add-image-btn" type="button">+ Add Image</button>
            <div class="image-selector-items" id="image-selector-items"></div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);

    // Event listeners
    document.getElementById('slide-backgroundColor').addEventListener('input', (e) => {
        slide.backgroundColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-imageWidth').addEventListener('input', (e) => {
        slide.imageWidth = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-textColor').addEventListener('input', (e) => {
        slide.textColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-dotColor').addEventListener('input', (e) => {
        slide.dotColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-dotActiveColor').addEventListener('input', (e) => {
        slide.dotActiveColor = e.target.value;
        updatePreview();
    });

    document.getElementById('add-image-btn').addEventListener('click', () => {
        slide.images.push({
            src: '',
            alt: '',
            text: ''
        });
        renderImageSelectorItems(slide, index);
        updatePreview();
    });

    renderImageSelectorItems(slide, index);
}

function renderImageSelectorItems(slide, slideIndex) {
    const container = document.getElementById('image-selector-items');
    container.innerHTML = '';

    slide.images.forEach((image, imageIndex) => {
        const item = document.createElement('div');
        item.className = 'image-selector-item';
        item.innerHTML = `
            <div class="image-selector-item-header">
                <strong>Image ${imageIndex + 1}</strong>
                <button class="btn-danger btn-small" onclick="window.deleteImageSelectorItem(${slideIndex}, ${imageIndex})">Delete</button>
            </div>
            <div class="form-group">
                <label>Image</label>
                <div class="file-upload">
                    <label class="file-upload-btn" for="slide-${slideIndex}-image-${imageIndex}">Choose Image</label>
                    <input type="file" id="slide-${slideIndex}-image-${imageIndex}" accept="image/*">
                    <span class="file-name">${image.src ? 'Image selected' : 'No file chosen'}</span>
                </div>
                ${image.src ? `<div class="file-preview"><img src="${image.src}" alt="Preview" style="max-width: 100px;"></div>` : ''}
            </div>
            <div class="form-group">
                <label>Alt Text</label>
                <input type="text" id="slide-${slideIndex}-alt-${imageIndex}" value="${image.alt || ''}" placeholder="Description">
            </div>
            <div class="form-group">
                <label>Display Text</label>
                <input type="text" id="slide-${slideIndex}-text-${imageIndex}" value="${image.text || ''}" placeholder="Text shown below image">
            </div>
        `;
        container.appendChild(item);

        // Event listeners for this image
        document.getElementById(`slide-${slideIndex}-image-${imageIndex}`).addEventListener('change', (e) => {
            handleFileUpload(e.target.files[0], (dataUrl, filename) => {
                image.src = dataUrl;
                image.srcFilename = filename;
                renderImageSelectorItems(slide, slideIndex);
                updatePreview();
            });
        });

        document.getElementById(`slide-${slideIndex}-alt-${imageIndex}`).addEventListener('input', (e) => {
            image.alt = e.target.value;
        });

        document.getElementById(`slide-${slideIndex}-text-${imageIndex}`).addEventListener('input', (e) => {
            image.text = e.target.value;
            updatePreview();
        });
    });
}

window.deleteImageSelectorItem = (slideIndex, imageIndex) => {
    const slide = carouselConfig.slides[slideIndex];
    slide.images.splice(imageIndex, 1);
    renderImageSelectorItems(slide, slideIndex);
    updatePreview();
};

function renderButtonEditor(slide, index) {
    if (!slide.button) {
        slide.button = null;
    }

    const hasButton = slide.button !== null;

    return `
        <div class="collapsible-section ${hasButton ? 'active' : ''}">
            <div class="collapsible-header" onclick="this.parentElement.classList.toggle('active')">
                <span>Button (optional)</span>
                <span class="collapsible-icon">â–¶</span>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="slide-hasButton" ${hasButton ? 'checked' : ''}>
                        Add button to slide
                    </label>
                </div>
                <div id="button-fields" style="display: ${hasButton ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>Button Text</label>
                        <input type="text" id="slide-button-text" value="${slide.button?.text || 'Les mer'}" placeholder="Button text">
                    </div>
                    <div class="form-group">
                        <label>Button URL</label>
                        <input type="url" id="slide-button-url" value="${slide.button?.url || ''}" placeholder="https://example.com">
                    </div>
                    <div class="form-group">
                        <label>Button Color</label>
                        <input type="color" id="slide-button-color" value="${slide.button?.color || '#13264A'}">
                    </div>
                    <div class="form-group">
                        <label>Button Text Color</label>
                        <input type="color" id="slide-button-textColor" value="${slide.button?.textColor || '#ffffff'}">
                    </div>
                    <div class="form-group">
                        <label>Button Placement</label>
                        <select id="slide-button-placement">
                            <option value="top-left" ${slide.button?.placement === 'top-left' ? 'selected' : ''}>Top Left</option>
                            <option value="top-right" ${slide.button?.placement === 'top-right' ? 'selected' : ''}>Top Right</option>
                            <option value="bottom-left" ${slide.button?.placement === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
                            <option value="bottom-right" ${slide.button?.placement === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupButtonEditorListeners(slide, index) {
    const hasButtonCheckbox = document.getElementById('slide-hasButton');
    const buttonFields = document.getElementById('button-fields');

    hasButtonCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            slide.button = {
                text: 'Les mer',
                url: '',
                color: '#13264A',
                textColor: '#ffffff',
                placement: 'bottom-right'
            };
            buttonFields.style.display = 'block';

            // Re-render the slide editor to attach listeners to new button fields
            renderSlideEditor(index);
        } else {
            slide.button = null;
            buttonFields.style.display = 'none';
        }
        updatePreview();
    });

    // Only attach listeners if button exists
    if (slide.button) {
        const buttonText = document.getElementById('slide-button-text');
        const buttonUrl = document.getElementById('slide-button-url');
        const buttonColor = document.getElementById('slide-button-color');
        const buttonTextColor = document.getElementById('slide-button-textColor');
        const buttonPlacement = document.getElementById('slide-button-placement');

        if (buttonText) {
            buttonText.addEventListener('input', (e) => {
                slide.button.text = e.target.value;
                updatePreview();
            });
        }

        if (buttonUrl) {
            buttonUrl.addEventListener('input', (e) => {
                slide.button.url = e.target.value;
                updatePreview();
            });
        }

        if (buttonColor) {
            buttonColor.addEventListener('input', (e) => {
                slide.button.color = e.target.value;
                updatePreview();
            });
        }

        if (buttonTextColor) {
            buttonTextColor.addEventListener('input', (e) => {
                slide.button.textColor = e.target.value;
                updatePreview();
            });
        }

        if (buttonPlacement) {
            buttonPlacement.addEventListener('change', (e) => {
                slide.button.placement = e.target.value;
                updatePreview();
            });
        }
    }
}

function handleFileUpload(file, callback) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        uploadedAssets.set(file.name, file);
        callback(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
}

function updatePreview() {
    const frame = document.getElementById('previewFrame');
    if (!frame) {
        console.warn('Preview frame not found');
        return;
    }

    // Create preview HTML
    const previewHtml = generatePreviewHTML();

    // Wait for iframe to be ready, then write to it
    try {
        const doc = frame.contentDocument || frame.contentWindow.document;
        if (doc) {
            doc.open();
            doc.write(previewHtml);
            doc.close();
        }
    } catch (error) {
        console.error('Error updating preview:', error);
        // Try again after a short delay
        setTimeout(() => {
            try {
                const doc = frame.contentDocument || frame.contentWindow.document;
                doc.open();
                doc.write(previewHtml);
                doc.close();
            } catch (e) {
                console.error('Failed to update preview:', e);
            }
        }, 100);
    }
}

function generatePreviewHTML() {
    // This will load the carousel runtime with the current config
    // Get the base URL for Vite dev server
    const baseUrl = window.location.origin;

    console.log('Generating preview with config:', carouselConfig);
    console.log('Runtime URL:', `${baseUrl}/carousel-runtime.js`);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <script>
        console.log('Preview iframe loading...');
        window.carouselConfig = ${JSON.stringify(carouselConfig, null, 2)};
        console.log('Config loaded in iframe:', window.carouselConfig);
    </script>
</head>
<body style="margin: 0; padding: 0;">
    <div id="carousel-container"></div>
    <script src="${baseUrl}/carousel-runtime.js"></script>
</body>
</html>`;
}

function showLoadProjectModal() {
    const modal = document.getElementById('loadProjectModal');
    const projectsList = document.getElementById('projectsList');

    const projects = loadFromStorage();
    const projectEntries = Object.entries(projects);

    if (projectEntries.length === 0) {
        projectsList.innerHTML = '<p class="help-text">No saved projects found. Projects are auto-saved every 5 seconds while you work.</p>';
    } else {
        projectsList.innerHTML = '';
        projectEntries.forEach(([id, project]) => {
            const projectItem = document.createElement('div');
            projectItem.className = 'slide-item';
            projectItem.style.cursor = 'pointer';

            const lastModified = new Date(project.lastModified);
            const customerName = project.config.customerName || 'Untitled';
            const slideCount = project.config.slides.length;

            projectItem.innerHTML = `
                <div class="slide-item-header">
                    <div>
                        <div class="slide-item-title">${customerName}</div>
                        <div class="slide-item-type">
                            ID: ${id} | ${slideCount} slides | Last modified: ${lastModified.toLocaleString()}
                        </div>
                    </div>
                    <div class="slide-item-actions">
                        <button class="btn-secondary btn-small" onclick="window.loadProject('${id}')">Load</button>
                        <button class="btn-danger btn-small" onclick="window.deleteProject('${id}')">Delete</button>
                    </div>
                </div>
            `;

            projectsList.appendChild(projectItem);
        });
    }

    modal.classList.add('active');
}

window.loadProject = (id) => {
    const projects = loadFromStorage();
    const project = projects[id];

    if (!project) {
        alert('Project not found');
        return;
    }

    // Load config
    carouselConfig = project.config;

    // Load assets
    uploadedAssets.clear();
    if (project.assets) {
        project.assets.forEach(([filename, fileData]) => {
            // Reconstruct File objects from stored data
            if (fileData && fileData.name) {
                uploadedAssets.set(filename, fileData);
            }
        });
    }

    // Update UI
    document.getElementById('carouselId').value = carouselConfig.carouselId;
    document.getElementById('disclaimerText').value = carouselConfig.disclaimerText;
    document.getElementById('customerName').value = carouselConfig.customerName;
    document.getElementById('autoRotate').checked = carouselConfig.autoRotate;
    document.getElementById('autoRotateDelay').value = carouselConfig.autoRotateDelay;
    document.getElementById('autoRotateSpeed').value = carouselConfig.autoRotateSpeed;
    document.getElementById('carouselHeight').value = carouselConfig.carouselHeight;
    document.getElementById('slideHeight').value = carouselConfig.slideHeight;

    // Reset editing state
    currentEditingSlideIndex = null;
    document.getElementById('slideEditor').style.display = 'none';

    // Refresh UI
    renderSlidesList();
    updatePreview();

    // Close modal
    document.getElementById('loadProjectModal').classList.remove('active');

    alert(`Loaded project: ${carouselConfig.customerName || 'Untitled'}`);
};

window.deleteProject = (id) => {
    if (!confirm('Are you sure you want to delete this project?')) {
        return;
    }

    const projects = loadFromStorage();
    delete projects[id];
    saveToStorage(projects);

    showLoadProjectModal();
};

async function exportToZip() {
    const zip = new JSZip();

    // Add config.json
    const config = prepareConfigForExport();
    zip.file('config.json', JSON.stringify(config, null, 2));

    // Add all uploaded assets
    const assetsFolder = zip.folder('assets');
    for (const [filename, file] of uploadedAssets.entries()) {
        assetsFolder.file(filename, file);
    }

    // Add carousel runtime script
    const runtimeScript = await fetch('/carousel-runtime.js').then(r => r.text());
    zip.file('carousel-runtime.js', runtimeScript);

    // Add README
    const readme = `# Carousel Advertorial - ${carouselConfig.customerName || 'Untitled'}

Carousel ID: ${carouselConfig.carouselId}

## Installation

1. Upload all files in the 'assets' folder to your S3 bucket
2. Upload carousel-runtime.js to your S3 bucket
3. Upload config.json to your S3 bucket
4. In Google Ad Manager creative template, reference the carousel-runtime.js from CloudFront
5. The creative template should pass the config.json URL to the runtime script

## Files

- config.json: Contains all slide configurations and settings
- carousel-runtime.js: The runtime script that renders the carousel
- assets/: All images and videos used in the carousel

## Usage in Google Ad Manager

The creative template should include:
\`\`\`html
<script>
    window.carouselConfigUrl = 'YOUR_CLOUDFRONT_URL/config.json';
</script>
<script src="YOUR_CLOUDFRONT_URL/carousel-runtime.js"></script>
<div id="carousel-container"></div>
\`\`\`
`;

    zip.file('README.md', readme);

    // Generate and download
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `carousel-${carouselConfig.carouselId}.zip`);
}

function prepareConfigForExport() {
    // Replace data URLs with asset filenames
    const exportConfig = JSON.parse(JSON.stringify(carouselConfig));

    exportConfig.slides.forEach(slide => {
        if (slide.srcFilename) {
            slide.src = `assets/${slide.srcFilename}`;
            delete slide.srcFilename;
        }
        if (slide.posterFilename) {
            slide.posterSrc = `assets/${slide.posterFilename}`;
            delete slide.posterFilename;
        }
        if (slide.images) {
            slide.images.forEach(image => {
                if (image.srcFilename) {
                    image.src = `assets/${image.srcFilename}`;
                    delete image.srcFilename;
                }
            });
        }
    });

    return exportConfig;
}

export { carouselConfig, updatePreview };