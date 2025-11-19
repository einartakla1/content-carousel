import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Sortable from 'sortablejs';
import { slideTemplates } from './slideTemplates.js';

// State
const API_BASE = '/api';

// API Helper Functions

// Get all projects
async function getAllProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects`);
        const data = await response.json();
        return data.projects || [];
    } catch (e) {
        console.error('Could not load projects:', e);
        return [];
    }
}

// Get a specific project
async function getProject(id) {
    try {
        const response = await fetch(`${API_BASE}/projects/${id}`);
        if (!response.ok) {
            throw new Error('Project not found');
        }
        const config = await response.json();
        return config;
    } catch (e) {
        console.error('Could not load project:', e);
        return null;
    }
}

// Save/Update a project
async function saveProject(config) {
    try {
        const id = config.carouselId;
        const url = `${API_BASE}/projects/${id}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            // If PUT fails (project doesn't exist), try POST
            const createResponse = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            return await createResponse.json();
        }

        return await response.json();
    } catch (e) {
        console.error('Could not save project:', e);
        throw e;
    }
}

// Delete a project
async function deleteProject(id) {
    try {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (e) {
        console.error('Could not delete project:', e);
        throw e;
    }
}

// Upload an asset
async function uploadAsset(projectId, file) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/projects/${projectId}/assets`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        return result.url; // Returns the URL to the uploaded file
    } catch (e) {
        console.error('Could not upload asset:', e);
        throw e;
    }
}

// Auto-save current project
async function autoSave() {
    if (!carouselConfig) return;

    try {
        await saveProject(carouselConfig);

        // Show feedback
        const status = document.getElementById('autoSaveStatus');
        if (status) {
            status.textContent = '✓ Auto-saved';
            setTimeout(() => {
                status.textContent = 'Auto-save: every 30 sec';
            }, 2000);
        }
    } catch (e) {
        console.error('Auto-save failed:', e);
    }
}

// Manual save current project
async function manualSave() {
    if (!carouselConfig) return;

    try {
        await saveProject(carouselConfig);

        // Show feedback
        const status = document.getElementById('autoSaveStatus');
        if (status) {
            status.textContent = '✓ Saved manually';
            status.style.color = '#4ade80'; // Green
            setTimeout(() => {
                status.textContent = 'Auto-save: every 30 sec';
                status.style.color = 'rgba(255,255,255,0.8)'; // Reset
            }, 3000);
        }
    } catch (e) {
        console.error('Manual save failed:', e);
        const status = document.getElementById('autoSaveStatus');
        if (status) {
            status.textContent = '✗ Save failed';
            status.style.color = '#ef4444'; // Red
            setTimeout(() => {
                status.textContent = 'Auto-save: every 30 sec';
                status.style.color = 'rgba(255,255,255,0.8)'; // Reset
            }, 3000);
        }
    }
}

let carouselConfig = null; // Will be initialized when user creates or loads a project

let uploadedAssets = new Map(); // Map to store uploaded files
let currentEditingSlideIndex = null;
let previewMode = 'edit'; // 'edit' or 'preview'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show startup modal and wait for user choice
    showStartupModal();

    // Setup event listeners (but don't initialize editor yet)
    setupEventListeners();
    setupStartupModalListeners();

    // Auto-save every 30 seconds (only saves if carouselConfig exists)
    setInterval(() => {
        if (carouselConfig) {
            autoSave();
        }
    }, 30000); // 30 seconds = 30000ms
});

function generateId() {
    return Math.floor(Math.random() * 1000000000);
}

function showStartupModal() {
    const modal = document.getElementById('startupModal');
    modal.classList.add('active');

    // Initialize Lucide icons in the modal
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function setupStartupModalListeners() {
    // Create New Carousel button
    document.getElementById('startupCreateNew').addEventListener('click', () => {
        createNewCarousel();
        closeStartupModal();
    });

    // Load Existing Carousel button
    document.getElementById('startupLoadExisting').addEventListener('click', () => {
        closeStartupModal();
        showLoadProjectModal(true); // Pass true to indicate this is from startup
    });
}

async function createNewCarousel() {
    // Initialize a new carousel config
    carouselConfig = {
        carouselId: generateId(),
        carouselName: '',
        disclaimerText: 'ANNONSØRINNHOLD',
        customerName: '',
        autoRotate: false,
        autoRotateDelay: 4000,
        carouselHeight: 516,
        slideHeight: 340,
        slides: []
    };

    // Save the new project immediately to create the folder structure
    try {
        await saveProject(carouselConfig);
        console.log('New project created:', carouselConfig.carouselId);
    } catch (error) {
        console.error('Failed to create project:', error);
    }

    // Clear any existing assets
    uploadedAssets.clear();

    // Reset editing state
    currentEditingSlideIndex = null;
    const slideEditor = document.getElementById('slideEditor');
    if (slideEditor) {
        slideEditor.style.display = 'none';
    }

    // Initialize the editor
    initializeEditor();

    // Update preview title
    updatePreviewTitle();

    // Setup collapsible sections (for Global Settings)
    setupCollapsibleSections();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Wait a bit for iframe to be ready before first preview
    setTimeout(() => {
        updatePreview();
    }, 100);
}

function closeStartupModal() {
    const modal = document.getElementById('startupModal');
    modal.classList.remove('active');
}

function initializeEditor() {
    document.getElementById('carouselId').value = carouselConfig.carouselId;
    document.getElementById('carouselName').value = carouselConfig.carouselName || '';
    document.getElementById('disclaimerText').value = carouselConfig.disclaimerText;
    document.getElementById('customerName').value = carouselConfig.customerName;
    document.getElementById('autoRotate').checked = carouselConfig.autoRotate;
    document.getElementById('autoRotateDelay').value = carouselConfig.autoRotateDelay;
    document.getElementById('carouselHeight').value = carouselConfig.carouselHeight;
    document.getElementById('slideHeight').value = carouselConfig.slideHeight;

    // Initialize slides list
    renderSlidesList();
}

function updatePreviewTitle() {
    const previewTitle = document.getElementById('previewTitle');
    if (previewTitle && carouselConfig) {
        const name = carouselConfig.carouselName || 'Untitled';
        previewTitle.textContent = `${name} – Preview`;
    }
}

function setupEventListeners() {
    // Carousel settings
    document.getElementById('carouselName').addEventListener('input', (e) => {
        carouselConfig.carouselName = e.target.value;
        updatePreviewTitle();
    });

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
        initializeLucideIcons();
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

    // New project button
    document.getElementById('newProjectBtn').addEventListener('click', () => {
        if (confirm('Start a new project? Your current project has been auto-saved.')) {
            createNewCarousel();
        }
    });

    // Load project button
    document.getElementById('loadProjectBtn').addEventListener('click', () => {
        showLoadProjectModal();
    });

    // Manual save button
    document.getElementById('manualSaveBtn').addEventListener('click', () => {
        if (carouselConfig) {
            manualSave();
        }
    });

    // Keyboard shortcut for save (Cmd+S / Ctrl+S)
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (carouselConfig) {
                manualSave();
            }
        }
    });

    // Cancel load project
    document.getElementById('cancelLoadProject').addEventListener('click', () => {
        const modal = document.getElementById('loadProjectModal');
        const fromStartup = modal.dataset.fromStartup === 'true';

        modal.classList.remove('active');

        // If canceling from startup and no carousel exists, show startup modal again
        if (fromStartup && !carouselConfig) {
            showStartupModal();
        }
    });

    // Refresh preview button
    document.getElementById('refreshPreviewBtn').addEventListener('click', () => {
        updatePreview();
    });

    // Preview mode controls (Edit Mode vs Preview Mode)
    document.querySelectorAll('[data-preview-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-preview-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            previewMode = btn.dataset.previewMode;
            updatePreview();
        });
    });

    // Preview controls (Desktop vs Mobile)
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
        item.setAttribute('data-slide-index', index);
        if (currentEditingSlideIndex === index) {
            item.classList.add('active');
        }

        item.innerHTML = `
            <div class="slide-item-header">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <span class="drag-handle" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="16" y2="6"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                            <line x1="8" y1="18" x2="16" y2="18"></line>
                        </svg>
                    </span>
                    <div style="flex: 1;">
                        <div class="slide-item-title">${slide.name || `Slide ${index + 1}`}</div>
                        <div class="slide-item-type">${getSlideTypeName(slide.type)}</div>
                    </div>
                </div>
                <div class="slide-item-actions" onclick="event.stopPropagation();">
                    <button class="btn-secondary btn-small" onclick="window.duplicateSlide(${index})" style="margin-right: 4px;">Duplicate</button>
                    <button class="btn-danger btn-small" onclick="window.deleteSlide(${index})">Delete</button>
                </div>
            </div>
        `;

        // Make the entire item clickable for editing (except the delete button area)
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.slide-item-actions') && !e.target.closest('.drag-handle')) {
                window.editSlide(index);
            }
        });

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
    // Smart save: Save before switching slides
    if (carouselConfig && currentEditingSlideIndex !== null) {
        autoSave();
    }

    currentEditingSlideIndex = index;
    renderSlidesList();
    renderSlideEditor(index);

    // Scroll preview to the selected slide
    scrollPreviewToSlide(index);
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

window.duplicateSlide = (index) => {
    // Create a deep copy of the slide
    const originalSlide = carouselConfig.slides[index];
    const duplicatedSlide = JSON.parse(JSON.stringify(originalSlide));

    // Update the name to indicate it's a copy
    if (duplicatedSlide.name) {
        duplicatedSlide.name = duplicatedSlide.name + ' (Copy)';
    } else {
        duplicatedSlide.name = `Slide ${index + 1} (Copy)`;
    }

    // Insert the duplicated slide right after the original
    carouselConfig.slides.splice(index + 1, 0, duplicatedSlide);

    // Update current editing index if needed
    if (currentEditingSlideIndex !== null && currentEditingSlideIndex > index) {
        currentEditingSlideIndex++;
    }

    // Refresh UI
    renderSlidesList();
    updatePreview();

    // Select the duplicated slide for editing
    window.editSlide(index + 1);
};

function initializeLucideIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderSlideEditor(index) {
    const slide = carouselConfig.slides[index];
    const editor = document.getElementById('slideEditor');
    const content = document.getElementById('slideEditorContent');

    editor.style.display = 'flex';
    content.innerHTML = '';

    // Common fields
    const commonFields = `
        <div class="form-group">
            <label>Slide Name (internal use)</label>
            <input type="text" id="slide-name" value="${slide.name || ''}" placeholder="e.g., Hero Image, Product Shot">
            <p class="help-text">This helps you identify slides in the list</p>
        </div>
        <div class="form-group">
            <label>Desktop Size</label>
            <select id="slide-size">
                <option value="regular" ${slide.size === 'regular' ? 'selected' : ''}>Single (340px)</option>
                <option value="double" ${slide.size === 'double' ? 'selected' : ''}>Double (680px)</option>
            </select>
        </div>
        <div class="form-group">
            <label>Mobile Size</label>
            <select id="slide-mobile-size">
                <option value="regular" ${(slide.mobileSize || 'regular') === 'regular' ? 'selected' : ''}>Single (340px)</option>
                <option value="double" ${(slide.mobileSize || 'regular') === 'double' ? 'selected' : ''}>Double (680px)</option>
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

    document.getElementById('slide-mobile-size').addEventListener('change', (e) => {
        slide.mobileSize = e.target.value;
        updatePreview();
    });

    // Setup collapsible sections
    setupCollapsibleSections();

    // Initialize Lucide icons for any new content
    initializeLucideIcons();
}

function setupCollapsibleSections() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        // Remove any existing listeners
        const newHeader = header.cloneNode(true);
        header.parentNode.replaceChild(newHeader, header);

        newHeader.addEventListener('click', function () {
            this.parentElement.classList.toggle('active');
        });
    });
}

function createCollapsibleSection(title, content, isActive = false) {
    return `
        <div class="collapsible-section ${isActive ? 'active' : ''}">
            <div class="collapsible-header">
                <span>${title}</span>
                <i data-lucide="chevron-right" class="collapsible-icon" style="width: 16px; height: 16px;"></i>
            </div>
            <div class="collapsible-content">
                ${content}
            </div>
        </div>
    `;
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
            <label>
                <input type="checkbox" id="slide-useZoom" ${slide.useZoom ? 'checked' : ''}>
                Use Ken Burns zoom effect
            </label>
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the image">
        </div>
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="slide-backgroundColor" value="${slide.backgroundColor || '#ffffff'}">
            <p class="help-text">Visible when image is zoomed out or doesn't fill the slide</p>
        </div>
        ${renderImagePositioningEditor(slide)}
        ${renderButtonEditor(slide, index)}
        <div class="form-group">
            <label>Link URL from slide (optional)</label>
            <input type="url" id="slide-link" value="${slide.link || ''}" placeholder="https://example.com">
        </div>
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

    document.getElementById('slide-useZoom').addEventListener('change', (e) => {
        slide.useZoom = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    document.getElementById('slide-backgroundColor').addEventListener('input', (e) => {
        slide.backgroundColor = e.target.value;
        updatePreview();
    });

    setupImagePositioningListeners(slide, index);
    setupButtonEditorListeners(slide, index);

    document.getElementById('slide-link').addEventListener('input', (e) => {
        slide.link = e.target.value;
        updatePreview();
    });
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
            <label>
                <input type="checkbox" id="slide-useZoom" ${slide.useZoom ? 'checked' : ''}>
                Use Ken Burns zoom effect
            </label>
        </div>
        <div class="form-group">
            <label>Alt Text</label>
            <input type="text" id="slide-alt" value="${slide.alt || ''}" placeholder="Description of the image">
        </div>
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="slide-backgroundColor" value="${slide.backgroundColor || '#ffffff'}">
            <p class="help-text">Visible when image is zoomed out or doesn't fill the slide</p>
        </div>
        ${renderImagePositioningEditor(slide)}
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="slide-title" value="${slide.title || ''}" placeholder="Slide title">
        </div>
        <div class="form-group">
            <label>Text</label>
            <textarea id="slide-text">${slide.text || ''}</textarea>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header">
                <span>Fill Overlay</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="slide-useFillOverlay" ${slide.useFillOverlay ? 'checked' : ''}>
                        Use fill overlay
                    </label>
                </div>
                <div class="form-group">
                    <label>Fill Color</label>
                    <input type="color" id="slide-fillColor" value="${slide.fillColor || '#000000'}">
                </div>
                <div class="form-group">
                    <label>Fill Height</label>
                    <input type="text" id="slide-fillHeight" value="${slide.fillHeight || '50%'}" placeholder="e.g., 50%, 200px">
                </div>
                <div class="form-group">
                    <label>Fill Direction</label>
                    <select id="slide-fillDirection">
                        <option value="bottom" ${slide.fillDirection === 'bottom' ? 'selected' : ''}>From Bottom</option>
                        <option value="top" ${slide.fillDirection === 'top' ? 'selected' : ''}>From Top</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header">
                <span>Gradient Overlay</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
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
                <div class="form-group">
                    <label>Gradient Direction</label>
                    <select id="slide-gradientDirection">
                        <option value="bottom" ${(slide.gradientDirection || 'bottom') === 'bottom' ? 'selected' : ''}>From Bottom</option>
                        <option value="top" ${slide.gradientDirection === 'top' ? 'selected' : ''}>From Top</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="collapsible-section">
            <div class="collapsible-header">
                <span>Text Styling</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
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
                    <label>Title Color</label>
                    <input type="color" id="slide-titleColor" value="${slide.titleColor || '#ffffff'}">
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
        ${renderButtonEditor(slide, index)}
        <div class="form-group">
            <label>Link URL from slide (optional)</label>
            <input type="url" id="slide-link" value="${slide.link || ''}" placeholder="https://example.com">
        </div>
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

    document.getElementById('slide-useZoom').addEventListener('change', (e) => {
        slide.useZoom = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-alt').addEventListener('input', (e) => {
        slide.alt = e.target.value;
    });

    document.getElementById('slide-backgroundColor').addEventListener('input', (e) => {
        slide.backgroundColor = e.target.value;
        updatePreview();
    });

    setupImagePositioningListeners(slide, index);

    document.getElementById('slide-title').addEventListener('input', (e) => {
        slide.title = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-text').addEventListener('input', (e) => {
        slide.text = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-useFillOverlay').addEventListener('change', (e) => {
        slide.useFillOverlay = e.target.checked;
        updatePreview();
    });

    document.getElementById('slide-fillColor').addEventListener('input', (e) => {
        slide.fillColor = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-fillHeight').addEventListener('input', (e) => {
        slide.fillHeight = e.target.value;
        updatePreview();
    });

    document.getElementById('slide-fillDirection').addEventListener('change', (e) => {
        slide.fillDirection = e.target.value;
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

    document.getElementById('slide-gradientDirection').addEventListener('change', (e) => {
        slide.gradientDirection = e.target.value;
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

    document.getElementById('slide-link').addEventListener('input', (e) => {
        slide.link = e.target.value;
        updatePreview();
    });
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
            <div class="collapsible-header">
                <span>Text Styling</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
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
                    <label>Title Color</label>
                    <input type="color" id="slide-titleColor" value="${slide.titleColor || '#ffffff'}">
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
            <div class="collapsible-header">
                <span>Gradient Overlay</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
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

function renderImagePositioningEditor(slide) {
    // Ensure imageTransform exists with default values
    if (!slide.imageTransform) {
        slide.imageTransform = {
            scale: 100,
            translateX: 0,
            translateY: 0,
            rotate: 0
        };
    }

    return `
        <div class="collapsible-section">
            <div class="collapsible-header">
                <span>Image Positioning</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
            </div>
            <div class="collapsible-content">
                <div class="form-group">
                    <label>Zoom / Scale (%)</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-secondary btn-small" id="scale-decrease">−</button>
                        <input type="number" id="slide-imageTransform-scale" value="${slide.imageTransform.scale}" min="10" max="500" step="1" style="flex: 1;">
                        <button type="button" class="btn-secondary btn-small" id="scale-increase">+</button>
                    </div>
                    <p class="help-text">100% = original size</p>
                </div>
                <div class="form-group">
                    <label>Position X (px)</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-secondary btn-small" id="translateX-decrease">−</button>
                        <input type="number" id="slide-imageTransform-translateX" value="${slide.imageTransform.translateX}" min="-500" max="500" step="1" style="flex: 1;">
                        <button type="button" class="btn-secondary btn-small" id="translateX-increase">+</button>
                    </div>
                    <p class="help-text">Negative = left, Positive = right</p>
                </div>
                <div class="form-group">
                    <label>Position Y (px)</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-secondary btn-small" id="translateY-decrease">−</button>
                        <input type="number" id="slide-imageTransform-translateY" value="${slide.imageTransform.translateY}" min="-500" max="500" step="1" style="flex: 1;">
                        <button type="button" class="btn-secondary btn-small" id="translateY-increase">+</button>
                    </div>
                    <p class="help-text">Negative = up, Positive = down</p>
                </div>
                <div class="form-group">
                    <label>Rotation (degrees)</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn-secondary btn-small" id="rotate-decrease">−</button>
                        <input type="number" id="slide-imageTransform-rotate" value="${slide.imageTransform.rotate}" min="-180" max="180" step="1" style="flex: 1;">
                        <button type="button" class="btn-secondary btn-small" id="rotate-increase">+</button>
                    </div>
                    <p class="help-text">Rotate image clockwise or counter-clockwise</p>
                </div>
                <div class="form-group">
                    <button type="button" class="btn-secondary" id="reset-image-transform" style="width: 100%;">Reset to Default</button>
                </div>
            </div>
        </div>
    `;
}

function setupImagePositioningListeners(slide, index) {
    // Ensure imageTransform exists
    if (!slide.imageTransform) {
        slide.imageTransform = {
            scale: 100,
            translateX: 0,
            translateY: 0,
            rotate: 0
        };
    }

    // Scale controls
    const scaleInput = document.getElementById('slide-imageTransform-scale');
    const scaleDecrease = document.getElementById('scale-decrease');
    const scaleIncrease = document.getElementById('scale-increase');

    scaleInput.addEventListener('input', (e) => {
        slide.imageTransform.scale = parseInt(e.target.value) || 100;
        updatePreviewImageTransform(index);
    });

    scaleDecrease.addEventListener('click', () => {
        slide.imageTransform.scale = Math.max(10, (slide.imageTransform.scale || 100) - 1);
        scaleInput.value = slide.imageTransform.scale;
        updatePreviewImageTransform(index);
    });

    scaleIncrease.addEventListener('click', () => {
        slide.imageTransform.scale = Math.min(500, (slide.imageTransform.scale || 100) + 1);
        scaleInput.value = slide.imageTransform.scale;
        updatePreviewImageTransform(index);
    });

    // TranslateX controls
    const translateXInput = document.getElementById('slide-imageTransform-translateX');
    const translateXDecrease = document.getElementById('translateX-decrease');
    const translateXIncrease = document.getElementById('translateX-increase');

    translateXInput.addEventListener('input', (e) => {
        slide.imageTransform.translateX = parseInt(e.target.value) || 0;
        updatePreviewImageTransform(index);
    });

    translateXDecrease.addEventListener('click', () => {
        slide.imageTransform.translateX = Math.max(-500, (slide.imageTransform.translateX || 0) - 1);
        translateXInput.value = slide.imageTransform.translateX;
        updatePreviewImageTransform(index);
    });

    translateXIncrease.addEventListener('click', () => {
        slide.imageTransform.translateX = Math.min(500, (slide.imageTransform.translateX || 0) + 1);
        translateXInput.value = slide.imageTransform.translateX;
        updatePreviewImageTransform(index);
    });

    // TranslateY controls
    const translateYInput = document.getElementById('slide-imageTransform-translateY');
    const translateYDecrease = document.getElementById('translateY-decrease');
    const translateYIncrease = document.getElementById('translateY-increase');

    translateYInput.addEventListener('input', (e) => {
        slide.imageTransform.translateY = parseInt(e.target.value) || 0;
        updatePreviewImageTransform(index);
    });

    translateYDecrease.addEventListener('click', () => {
        slide.imageTransform.translateY = Math.max(-500, (slide.imageTransform.translateY || 0) - 1);
        translateYInput.value = slide.imageTransform.translateY;
        updatePreviewImageTransform(index);
    });

    translateYIncrease.addEventListener('click', () => {
        slide.imageTransform.translateY = Math.min(500, (slide.imageTransform.translateY || 0) + 1);
        translateYInput.value = slide.imageTransform.translateY;
        updatePreviewImageTransform(index);
    });

    // Rotate controls
    const rotateInput = document.getElementById('slide-imageTransform-rotate');
    const rotateDecrease = document.getElementById('rotate-decrease');
    const rotateIncrease = document.getElementById('rotate-increase');

    rotateInput.addEventListener('input', (e) => {
        slide.imageTransform.rotate = parseInt(e.target.value) || 0;
        updatePreviewImageTransform(index);
    });

    rotateDecrease.addEventListener('click', () => {
        slide.imageTransform.rotate = Math.max(-180, (slide.imageTransform.rotate || 0) - 1);
        rotateInput.value = slide.imageTransform.rotate;
        updatePreviewImageTransform(index);
    });

    rotateIncrease.addEventListener('click', () => {
        slide.imageTransform.rotate = Math.min(180, (slide.imageTransform.rotate || 0) + 1);
        rotateInput.value = slide.imageTransform.rotate;
        updatePreviewImageTransform(index);
    });

    // Reset button
    const resetButton = document.getElementById('reset-image-transform');
    resetButton.addEventListener('click', () => {
        slide.imageTransform = {
            scale: 100,
            translateX: 0,
            translateY: 0,
            rotate: 0
        };
        scaleInput.value = 100;
        translateXInput.value = 0;
        translateYInput.value = 0;
        rotateInput.value = 0;
        updatePreviewImageTransform(index);
    });
}

function renderButtonEditor(slide, index) {
    if (!slide.button) {
        slide.button = null;
    }

    const hasButton = slide.button !== null;

    return `
        <div class="collapsible-section ${hasButton ? 'active' : ''}">
            <div class="collapsible-header">
                <span>Button (optional)</span>
                <i data-lucide="chevron-right" class="collapsible-icon"></i>
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

async function handleFileUpload(file, callback) {
    if (!file) return;
    if (!carouselConfig) {
        console.error('No carousel config - cannot upload file');
        return;
    }

    try {
        // Upload file to server
        const fileUrl = await uploadAsset(carouselConfig.carouselId, file);

        // Store reference to uploaded asset
        uploadedAssets.set(file.name, file);

        // Call callback with the server URL
        callback(fileUrl, file.name);
    } catch (error) {
        console.error('File upload failed:', error);
        alert('Failed to upload file. Please try again.');
    }
}

function updatePreview() {
    const container = document.getElementById('previewContainer');
    const oldFrame = document.getElementById('previewFrame');

    if (!container) {
        console.warn('Preview container not found');
        return;
    }

    // Determine current preview mode (desktop/mobile)
    let previewMode = 'desktop';
    if (oldFrame) {
        previewMode = oldFrame.classList.contains('mobile') ? 'mobile' : 'desktop';
        // Completely remove the old iframe to destroy all timers and event listeners
        oldFrame.remove();
    }

    // Create a new iframe element
    const newFrame = document.createElement('iframe');
    newFrame.id = 'previewFrame';
    newFrame.className = `preview-frame ${previewMode}`;
    newFrame.style.height = `${carouselConfig.carouselHeight}px`;
    container.appendChild(newFrame);

    // Create preview HTML
    const previewHtml = generatePreviewHTML();

    // Wait for iframe to be ready before writing content
    // This ensures proper initialization of the iframe's document
    setTimeout(() => {
        try {
            const doc = newFrame.contentDocument || newFrame.contentWindow.document;
            if (doc) {
                doc.open();
                doc.write(previewHtml);
                doc.close();

                // Scroll to currently edited slide if in edit mode
                if (currentEditingSlideIndex !== null) {
                    scrollPreviewToSlide(currentEditingSlideIndex);
                }
            }
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }, 0);
}

function scrollPreviewToSlide(index) {
    // Only auto-scroll to selected slide in edit mode
    if (previewMode !== 'edit') return;

    const frame = document.getElementById('previewFrame');
    if (!frame) return;

    // Wait a bit for the iframe content to be ready
    setTimeout(() => {
        try {
            const iframeDoc = frame.contentDocument || frame.contentWindow.document;
            const scrollContainer = iframeDoc.getElementById('scrollContainer');

            if (!scrollContainer) {
                console.warn('Scroll container not found in preview');
                return;
            }

            const slides = scrollContainer.querySelectorAll('.content-box');
            if (!slides[index]) {
                console.warn(`Slide ${index} not found in preview`);
                return;
            }

            // Scroll to the slide instantly (no animation in edit mode)
            slides[index].scrollIntoView({
                behavior: 'auto',
                block: 'nearest',
                inline: 'start'
            });
        } catch (error) {
            console.error('Error scrolling preview to slide:', error);
        }
    }, 200); // Delay to ensure iframe content is rendered
}

function updatePreviewImageTransform(slideIndex) {
    const frame = document.getElementById('previewFrame');
    if (!frame) return;

    try {
        const iframeDoc = frame.contentDocument || frame.contentWindow.document;
        const scrollContainer = iframeDoc.getElementById('scrollContainer');

        if (!scrollContainer) return;

        const slides = scrollContainer.querySelectorAll('.content-box');
        const slideElement = slides[slideIndex];

        if (!slideElement) return;

        // Find the image element in this slide
        const img = slideElement.querySelector('.content-image');
        if (!img) return;

        const slide = carouselConfig.slides[slideIndex];
        if (!slide.imageTransform) return;

        const { scale, translateX, translateY, rotate } = slide.imageTransform;

        // Apply the same transform logic as in carousel-runtime.js
        // Handle zoom/scale
        if (scale < 100) {
            img.style.objectFit = 'contain';
        } else {
            img.style.objectFit = 'cover';
        }

        // Build transform array
        const transforms = [];

        // Apply scale transform
        if (scale !== 100) {
            const scaleValue = scale / 100;
            transforms.push(`scale(${scaleValue})`);
        }

        // Handle panning differently based on zoom level
        if (scale > 100) {
            // When zoomed in, use transform translate for full 2D panning
            if (translateX !== 0 || translateY !== 0) {
                transforms.push(`translate(${translateX}px, ${translateY}px)`);
            }
            // Reset object-position to center when using transform translate
            img.style.objectPosition = '50% 50%';
        } else {
            // At 100% or zoomed out, use object-position for panning
            const centerX = 50;
            const centerY = 50;
            const offsetXPercent = centerX + (translateX / 10);
            const offsetYPercent = centerY + (translateY / 10);
            img.style.objectPosition = `${offsetXPercent}% ${offsetYPercent}%`;
        }

        // Add rotation
        if (rotate !== 0) {
            transforms.push(`rotate(${rotate}deg)`);
        }

        // Apply transforms
        if (transforms.length > 0) {
            img.style.transform = transforms.join(' ');
            img.style.transformOrigin = 'center center';
        } else {
            img.style.transform = '';
        }
    } catch (error) {
        console.error('Error updating preview image transform:', error);
    }
}

function generatePreviewHTML() {
    // This will load the carousel runtime with the current config
    // Get the base URL for Vite dev server
    const baseUrl = window.location.origin;

    // Create a copy of the config to modify for preview
    const previewConfig = { ...carouselConfig };

    // In edit mode, disable auto-rotate to prevent conflicts with editor scrolling
    if (previewMode === 'edit') {
        previewConfig.autoRotate = false;
    }

    console.log('Generating preview with config:', previewConfig);
    console.log('Preview mode:', previewMode);
    console.log('Runtime URL:', `${baseUrl}/carousel-runtime.js`);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview</title>
    <script>
        console.log('Preview iframe loading...');
        window.carouselConfig = ${JSON.stringify(previewConfig, null, 2)};
        console.log('Config loaded in iframe:', window.carouselConfig);
    </script>
</head>
<body style="margin: 0; padding: 0;">
    <div id="carousel-container"></div>
    <script src="${baseUrl}/carousel-runtime.js"></script>
</body>
</html>`;
}

async function showLoadProjectModal(fromStartup = false) {
    // Smart save: Save before loading another project
    if (carouselConfig && !fromStartup) {
        await autoSave();
    }

    const modal = document.getElementById('loadProjectModal');
    const projectsList = document.getElementById('projectsList');

    const projects = await getAllProjects();

    if (projects.length === 0) {
        if (fromStartup) {
            // If called from startup and no projects exist, create a new carousel instead
            alert('No saved projects found. Creating a new carousel.');
            createNewCarousel();
            return;
        }
        projectsList.innerHTML = '<p class="help-text">No saved projects found. Projects are auto-saved every 30 seconds while you work.</p>';
    } else {
        projectsList.innerHTML = '';
        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'slide-item';
            projectItem.style.cursor = 'pointer';

            const lastModified = new Date(project.lastModified);
            const displayName = project.name || 'Untitled';

            projectItem.innerHTML = `
                <div class="slide-item-header">
                    <div style="flex: 1;">
                        <div class="slide-item-title">${displayName}</div>
                        <div class="slide-item-type">
                            ID: ${project.id} | Last modified: ${lastModified.toLocaleString()}
                        </div>
                    </div>
                    <div class="slide-item-actions" onclick="event.stopPropagation();">
                        <button class="btn-danger btn-small" onclick="window.deleteProjectById('${project.id}', ${fromStartup})">Delete</button>
                    </div>
                </div>
            `;

            // Make the whole item clickable to load
            projectItem.addEventListener('click', () => {
                window.loadProjectById(project.id, fromStartup);
            });

            projectsList.appendChild(projectItem);
        });
    }

    modal.classList.add('active');

    // Store whether this was called from startup
    modal.dataset.fromStartup = fromStartup;

    // Initialize Lucide icons in modal
    initializeLucideIcons();
}

window.loadProjectById = async (id, fromStartup = false) => {
    const config = await getProject(id);

    if (!config) {
        alert('Project not found');
        return;
    }

    // Load config
    carouselConfig = config;

    // Clear assets map - assets are now stored on server
    uploadedAssets.clear();

    // Update UI
    document.getElementById('carouselId').value = carouselConfig.carouselId;
    document.getElementById('carouselName').value = carouselConfig.carouselName || '';
    document.getElementById('disclaimerText').value = carouselConfig.disclaimerText;
    document.getElementById('customerName').value = carouselConfig.customerName;
    document.getElementById('autoRotate').checked = carouselConfig.autoRotate;
    document.getElementById('autoRotateDelay').value = carouselConfig.autoRotateDelay;
    document.getElementById('carouselHeight').value = carouselConfig.carouselHeight;
    document.getElementById('slideHeight').value = carouselConfig.slideHeight;

    // Reset editing state
    currentEditingSlideIndex = null;
    document.getElementById('slideEditor').style.display = 'none';

    // Refresh UI
    renderSlidesList();
    updatePreview();
    updatePreviewTitle();

    // Setup collapsible sections (for Global Settings)
    setupCollapsibleSections();

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Close modal
    document.getElementById('loadProjectModal').classList.remove('active');

    if (!fromStartup) {
        const displayName = carouselConfig.carouselName || carouselConfig.customerName || 'Untitled';
        alert(`Loaded carousel: ${displayName}`);
    }
};

window.deleteProjectById = async (id, fromStartup = false) => {
    if (!confirm('Are you sure you want to delete this project?')) {
        return;
    }

    await deleteProject(id);

    // Refresh the modal with the same fromStartup state
    const modal = document.getElementById('loadProjectModal');
    modal.classList.remove('active');
    await showLoadProjectModal(fromStartup);
};

async function exportToZip() {
    // Smart save: Save before exporting
    if (carouselConfig) {
        autoSave();
    }

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