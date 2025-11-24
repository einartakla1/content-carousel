// Carousel Runtime Script
// This script will be loaded from CloudFront/S3 and renders the carousel based on the provided config

(function () {
    'use strict';

    // Helper function to convert line breaks to <br> tags and preserve formatting
    function formatText(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // Helper function to resolve asset URLs relative to config location
    let baseUrl = '';
    function resolveAssetUrl(url) {
        if (!url) return '';
        // If URL is already absolute, return as-is
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            return url;
        }
        // Otherwise, resolve relative to baseUrl
        if (baseUrl) {
            return baseUrl + url;
        }
        return url;
    }

    // Load config from window.carouselConfig or fetch from window.carouselConfigUrl
    let config = window.carouselConfig;

    if (!config && window.carouselConfigUrl) {
        // Extract base URL from config URL (everything up to the last /)
        const configUrl = window.carouselConfigUrl;
        baseUrl = configUrl.substring(0, configUrl.lastIndexOf('/') + 1);

        // Fetch config from URL
        fetch(configUrl)
            .then(response => response.json())
            .then(data => {
                config = data;
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', initCarousel);
                } else {
                    initCarousel();
                }
            })
            .catch(error => {
                console.error('Error loading carousel config:', error);
            });
    } else if (config) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initCarousel);
        } else {
            initCarousel();
        }
    } else {
        console.error('No carousel config provided');
    }

    function initCarousel() {
        // Inject styles
        injectStyles();

        // Render carousel
        renderCarousel();

        // Setup functionality
        setupScrollButtons();
        setupAutoRotate();
        setupIntersectionObserver();

        // Handle resize - only attach if checkScrollButtons exists
        window.addEventListener('resize', () => {
            if (window.checkScrollButtons) {
                window.checkScrollButtons();
            }
        });

        window.addEventListener('load', () => {
            if (window.checkScrollButtons) {
                window.checkScrollButtons();
            }
        });
    }

    function injectStyles() {
        const style = document.createElement('style');

        // Apply dynamic heights from config
        const carouselHeight = config.carouselHeight || 516;
        const slideHeight = config.slideHeight || 340;

        style.textContent = `
            @import url('https://static1.dn.no/dn/static/assets/css/nhstfonts.css');

            .dnxads {
                box-sizing: border-box;
                max-width: 980px !important;
                margin: auto;
            }

            .carousel-container {
                position: relative;
                width: 100%;
                height: ${carouselHeight}px;
                overflow: hidden;
                touch-action: pan-x;
                background-color: #f3f4f5;
                padding-left: 24px;
                padding-right: 24px;
                padding-top: 16px;
                padding-bottom: 16px;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
            }

            .carousel-header {
                font-family: Book20, Arial, sans-serif;
                font-size: 14px;
                margin-bottom: 16px;
                color: #000;
                flex-shrink: 0;
                text-transform: uppercase;
            }

            .scroll-container-wrapper {
                position: relative;
                flex-grow: 1;
                overflow: hidden;
            }

            .scroll-container {
                display: flex;
                overflow-x: auto;
                overflow-y: hidden;
                scroll-snap-type: x mandatory;
                scrollbar-width: none;
                -ms-overflow-style: none;
                height: 100%;
                -webkit-overflow-scrolling: touch;
            }

            .scroll-container::-webkit-scrollbar {
                display: none;
            }

            .content-box {
                flex: 0 0 auto;
                margin-right: 1rem;
                position: relative;
                scroll-snap-align: start;
                border-radius: 8px;
                overflow: hidden;
                height: ${slideHeight}px;
                width: 340px;
            }

            /* Desktop sizes (only apply on desktop) */
            @media (min-width: 601px) {
                .desktop-single {
                    width: 340px;
                }

                .desktop-double {
                    width: 680px;
                }
            }

            /* Mobile sizes (only apply on mobile) */
            @media (max-width: 600px) {
                .mobile-single {
                    width: 340px;
                }

                .mobile-double {
                    width: 680px;
                }
            }

            .content-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            }

            .video-box {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            }

            .zoom-effect {
                animation: kenBurnsEffect 15s ease-in-out infinite;
                transform-origin: center center;
            }

            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                33% { transform: scale(1.1); }
                66% { transform: scale(1); }
                100% { transform: scale(1); }
            }

            .text-overlay {
                position: absolute;
                padding: 16px;
                color: white;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }

            .text-overlay-content {
                font-family: Book20, Arial, sans-serif;
                font-size: 14px;
                z-index: 3;
                max-width: 100%;
                white-space: pre-wrap;
            }

            .text-overlay-title {
                font-family: Book20, Arial, sans-serif;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 8px;
                z-index: 3;
                max-width: 100%;
                white-space: pre-wrap;
            }

            .text-overlay-bottom {
                bottom: 0;
                left: 0;
                right: 0;
                justify-content: flex-end;
            }

            .text-overlay-top {
                top: 0;
                left: 0;
                right: 0;
                justify-content: flex-start;
            }

            .gradient-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }

            .text-box {
                padding: 24px;
                background-color: white;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .text-box-title {
                font-family: Book20, Arial, sans-serif;
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 16px;
                color: #13264A;
            }

            .text-box-content {
                font-family: Book20, Arial, sans-serif;
                font-size: 16px;
                line-height: 1.6;
                overflow-y: auto;
                color: #333;
                margin-bottom: auto;
                white-space: pre-wrap;
            }

            .big-number-box {
                padding: 24px;
                background-color: white;
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .big-number-box-number {
                font-family: Book20, Arial, sans-serif;
                font-size: 40px;
                font-weight: bold;
                margin-bottom: 8px;
                color: #13264A;
            }

            .big-number-box-content {
                font-family: Book20, Arial, sans-serif;
                font-size: 16px;
                line-height: 1.6;
                overflow-y: auto;
                color: #333;
                white-space: pre-wrap;
            }

            .big-number-box-divider {
                margin-bottom: 32px;
            }

            .image-selector {
                padding: 0;
                background-color: white;
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .image-selector-image-container {
                position: relative;
                margin: 20px 24px 20px 24px;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                justify-content: center;
                align-items: flex-start;
            }

            .image-selector-image {
                height: 100%;
                object-fit: cover;
                position: absolute;
                top: 0;
                transition: opacity 0.3s ease;
            }

            .image-selector-image.hidden {
                opacity: 0;
            }

            .image-selector-image.visible {
                opacity: 1;
            }

            .image-selector-text-container {
                text-align: center;
                margin: 0 24px 16px 24px;
                background-color: transparent;
                padding: 6px 10px;
                border-radius: 4px;
            }

            .image-selector-current-text {
                font-family: Book20, Arial, sans-serif;
                font-size: 14px;
                color: #333;
                line-height: 1.4;
                margin: 0;
            }

            .image-selector-dots {
                display: flex;
                justify-content: center;
                gap: 12px;
                margin-bottom: 24px;
            }

            .image-selector-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background-color: #ccc;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .image-selector-dot.active {
                background-color: #13264A;
                transform: scale(1.2);
            }

            .content-button {
                font-family: Book20, Arial, sans-serif;
                display: inline-block;
                padding: 10px 24px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                text-decoration: none;
                cursor: pointer;
                transition: background-color 0.3s, opacity 0.3s;
                z-index: 20;
                border: none;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .content-button:hover {
                opacity: 0.9;
            }

            .text-box-button-container {
                margin-top: 24px;
                margin-top: auto;
                padding-top: 16px;
            }

            .overlay-button-container {
                position: absolute;
                z-index: 20;
            }

            .button-placement-top-left {
                top: 16px;
                left: 16px;
            }

            .button-placement-top-right {
                top: 16px;
                right: 16px;
            }

            .button-placement-bottom-left {
                bottom: 16px;
                left: 16px;
            }

            .button-placement-bottom-right {
                bottom: 16px;
                right: 16px;
            }

            .scroll-button {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                background-color: #f3f4f5;
                padding: 6px;
                border-radius: 4px;
                z-index: 10;
                cursor: pointer;
                transition: transform 0.2s ease;
                border: none;
            }

            .scroll-button:hover {
                transform: translateY(-50%) scale(1.02);
            }

            .scroll-button-left {
                left: 0;
                transform: translateX(8px) translateY(-50%);
            }

            .scroll-button-right {
                right: 0;
                transform: translateX(-8px) translateY(-50%);
            }

            .chevron {
                color: #000;
                width: 24px;
                height: 24px;
            }

            @media (min-width: 900px) {
                .dnxads {
                    padding: 0;
                }
            }

            @media (max-width: 600px) {
                .carousel-container {
                    padding-top: 16px;
                    padding-right: 0px;
                    padding-bottom: 16px;
                    padding-left: 24px;
                }

                .scroll-container {
                    scroll-snap-type: none;
                }

                .text-overlay-title {
                    font-size: 16px;
                }

                .text-overlay-content {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function renderCarousel() {
        const container = document.getElementById('carousel-container');
        if (!container) {
            console.error('Carousel container not found');
            return;
        }

        // Build HTML structure
        const customerNameText = config.customerName ? ' | ' + config.customerName : '';

        const html = `
            <article>
                <div class="dnxads" id="dnxad">
                    <div id="carouselRoot" class="carousel-container">
                        <div class="carousel-header">
                            ${config.disclaimerText}${customerNameText}
                        </div>

                        <div class="scroll-container-wrapper">
                            <div id="scrollContainer" class="scroll-container"></div>
                        </div>
                        
                        <button id="scrollButtonLeft" class="scroll-button scroll-button-left" style="display: none;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 12L10.0607 20.0607L11.1213 19L4.87132 12.75L23.0608 12.75V11.25L4.87132 11.25L11.1213 4.99999L10.0607 3.93933L2 12Z" fill="#000000" />
                            </svg>
                        </button>
                        
                        <button id="scrollButtonRight" class="scroll-button scroll-button-right" style="display: none;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M23.0608 12L15.0001 3.93933L13.9395 4.99999L20.1895 11.25H2V12.75H20.1895L13.9395 19L15.0001 20.0607L23.0608 12Z" fill="#000000" />
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
        `;

        container.innerHTML = html;

        // Render slides
        const scrollContainer = document.getElementById('scrollContainer');
        config.slides.forEach(slide => {
            const slideElement = renderSlide(slide);
            scrollContainer.appendChild(slideElement);
        });
    }

    function getSizeClasses(slide) {
        const desktopClass = slide.size === 'double' ? 'desktop-double' : 'desktop-single';
        const mobileClass = (slide.mobileSize || 'regular') === 'double' ? 'mobile-double' : 'mobile-single';
        return `${desktopClass} ${mobileClass}`;
    }

    function renderSlide(slide) {
        switch (slide.type) {
            case 'fullImage':
                return renderFullImage(slide);
            case 'fullImageWithText':
                return renderFullImageWithText(slide);
            case 'text':
                return renderText(slide);
            case 'video':
                return renderVideo(slide);
            case 'fullVideoWithText':
                return renderFullVideoWithText(slide);
            case 'bigNumber':
                return renderBigNumber(slide);
            case 'imageSelector':
                return renderImageSelector(slide);
            default:
                console.warn(`Unknown slide type: ${slide.type}`);
                return document.createElement('div');
        }
    }

    function renderFullImage(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;
        box.style.position = 'relative';

        // Apply background color
        if (slide.backgroundColor) {
            box.style.backgroundColor = slide.backgroundColor;
        }

        const img = document.createElement('img');
        img.src = resolveAssetUrl(slide.src);
        img.alt = slide.alt;
        img.className = 'content-image';

        if (slide.useZoom) {
            img.classList.add('zoom-effect');
        }

        // Apply image transformations
        if (slide.imageTransform) {
            const { scale, translateX, translateY, rotate } = slide.imageTransform;

            // Handle zoom/scale
            if (scale < 100) {
                // Zooming out - switch to contain to show the full image
                img.style.objectFit = 'contain';
            } else {
                // At 100% or zooming in - use cover
                img.style.objectFit = 'cover';
            }

            // Build transform array
            const transforms = [];

            // Apply scale transform for zoom in/out
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
            }
        }

        box.appendChild(img);

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'overlay-button-container ' + getButtonPlacementClass(slide.button.placement);
            buttonContainer.appendChild(createButton(slide.button));
            box.appendChild(buttonContainer);
        }

        if (slide.link) {
            box.style.cursor = 'pointer';
            box.addEventListener('click', () => {
                window.open(slide.link, '_blank');
            });
        }

        return box;
    }

    function renderFullImageWithText(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;
        box.style.position = 'relative';

        // Apply background color
        if (slide.backgroundColor) {
            box.style.backgroundColor = slide.backgroundColor;
        }

        const img = document.createElement('img');
        img.src = resolveAssetUrl(slide.src);
        img.alt = slide.alt;
        img.className = 'content-image';

        if (slide.useZoom) {
            img.classList.add('zoom-effect');
        }

        // Apply image transformations
        if (slide.imageTransform) {
            const { scale, translateX, translateY, rotate } = slide.imageTransform;

            // Handle zoom/scale
            if (scale < 100) {
                // Zooming out - switch to contain to show the full image
                img.style.objectFit = 'contain';
            } else {
                // At 100% or zooming in - use cover
                img.style.objectFit = 'cover';
            }

            // Build transform array
            const transforms = [];

            // Apply scale transform for zoom in/out
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
            }
        }

        // Append in correct z-order: image (bottom), fill overlay, gradient overlay, text overlay (top)
        box.appendChild(img);

        // Create fill overlay if enabled
        if (slide.useFillOverlay) {
            const fillOverlay = document.createElement('div');
            fillOverlay.style.position = 'absolute';
            fillOverlay.style.left = '0';
            fillOverlay.style.right = '0';
            fillOverlay.style.pointerEvents = 'none';
            fillOverlay.style.backgroundColor = slide.fillColor || '#000000';
            fillOverlay.style.height = slide.fillHeight || '50%';

            // Apply fill direction
            if (slide.fillDirection === 'top') {
                fillOverlay.style.top = '0';
            } else {
                fillOverlay.style.bottom = '0';
            }

            box.appendChild(fillOverlay);
        }

        // Create gradient overlay if enabled (separate from text overlay)
        if (slide.useGradient) {
            const gradientOverlay = document.createElement('div');
            gradientOverlay.style.position = 'absolute';
            gradientOverlay.style.left = '0';
            gradientOverlay.style.right = '0';
            gradientOverlay.style.pointerEvents = 'none';
            gradientOverlay.style.height = slide.gradientHeight || '50%';

            const direction = slide.gradientDirection || 'bottom';
            const color = slide.gradientColor || '#000000';

            // Position and gradient direction based on gradientDirection
            if (direction === 'top') {
                gradientOverlay.style.top = '0';
                gradientOverlay.style.background = `linear-gradient(to bottom, ${color} 0%, rgba(0, 0, 0, 0) 100%)`;
            } else {
                gradientOverlay.style.bottom = '0';
                gradientOverlay.style.background = `linear-gradient(to top, ${color} 0%, rgba(0, 0, 0, 0) 100%)`;
            }

            box.appendChild(gradientOverlay);
        }

        const overlay = createTextOverlay(slide);
        box.appendChild(overlay);

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'overlay-button-container ' + getButtonPlacementClass(slide.button.placement);
            buttonContainer.appendChild(createButton(slide.button));
            box.appendChild(buttonContainer);
        }

        if (slide.link) {
            box.style.cursor = 'pointer';
            box.addEventListener('click', () => {
                window.open(slide.link, '_blank');
            });
        }

        return box;
    }

    function createTextOverlay(slide) {
        const overlay = document.createElement('div');
        overlay.className = `text-overlay ${slide.textPosition === 'top' ? 'text-overlay-top' : 'text-overlay-bottom'}`;
        overlay.style.pointerEvents = 'none';

        if (slide.title) {
            const title = document.createElement('div');
            title.className = 'text-overlay-title';
            title.innerHTML = formatText(slide.title);
            if (slide.textWidth) title.style.maxWidth = slide.textWidth;
            if (slide.titleColor) title.style.color = slide.titleColor;
            if (slide.titleFontSize) title.style.fontSize = slide.titleFontSize + 'px';
            overlay.appendChild(title);
        }

        if (slide.text) {
            const text = document.createElement('div');
            text.className = 'text-overlay-content';
            text.innerHTML = formatText(slide.text);
            if (slide.textWidth) text.style.maxWidth = slide.textWidth;
            if (slide.textColor) text.style.color = slide.textColor;
            if (slide.textFontSize) text.style.fontSize = slide.textFontSize + 'px';
            overlay.appendChild(text);
        }

        return overlay;
    }

    function renderText(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;
        box.style.position = 'relative';  // Enable absolute positioning for button

        const textBox = document.createElement('div');
        textBox.className = 'text-box';
        if (slide.backgroundColor) textBox.style.backgroundColor = slide.backgroundColor;

        const title = document.createElement('div');
        title.className = 'text-box-title';
        title.innerHTML = formatText(slide.title);
        if (slide.titleColor) title.style.color = slide.titleColor;
        if (slide.titleFontSize) title.style.fontSize = slide.titleFontSize + 'px';

        const text = document.createElement('div');
        text.className = 'text-box-content';
        text.innerHTML = formatText(slide.text);
        if (slide.textColor) text.style.color = slide.textColor;
        if (slide.textFontSize) text.style.fontSize = slide.textFontSize + 'px';

        textBox.appendChild(title);
        textBox.appendChild(text);

        box.appendChild(textBox);

        // Use same button positioning system as image slides
        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'overlay-button-container ' + getButtonPlacementClass(slide.button.placement);
            buttonContainer.appendChild(createButton(slide.button));
            box.appendChild(buttonContainer);
        }

        return box;
    }

    function renderVideo(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;
        box.style.position = 'relative';

        const video = document.createElement('video');
        video.className = 'video-box';
        video.src = resolveAssetUrl(slide.src);
        if (slide.posterSrc) video.poster = resolveAssetUrl(slide.posterSrc);
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');

        box.appendChild(video);

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'overlay-button-container ' + getButtonPlacementClass(slide.button.placement);
            buttonContainer.appendChild(createButton(slide.button));
            box.appendChild(buttonContainer);
        }

        return box;
    }

    function renderFullVideoWithText(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;
        box.style.position = 'relative';

        const video = document.createElement('video');
        video.className = 'video-box';
        video.src = resolveAssetUrl(slide.src);
        if (slide.posterSrc) video.poster = resolveAssetUrl(slide.posterSrc);
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');

        // Append in correct z-order: video (bottom), fill overlay, gradient overlay, text overlay (top)
        box.appendChild(video);

        // Create fill overlay if enabled
        if (slide.useFillOverlay) {
            const fillOverlay = document.createElement('div');
            fillOverlay.style.position = 'absolute';
            fillOverlay.style.left = '0';
            fillOverlay.style.right = '0';
            fillOverlay.style.pointerEvents = 'none';
            fillOverlay.style.backgroundColor = slide.fillColor || '#000000';
            fillOverlay.style.height = slide.fillHeight || '50%';

            // Apply fill direction
            if (slide.fillDirection === 'top') {
                fillOverlay.style.top = '0';
            } else {
                fillOverlay.style.bottom = '0';
            }

            box.appendChild(fillOverlay);
        }

        // Create gradient overlay if enabled (separate from text overlay)
        if (slide.useGradient) {
            const gradientOverlay = document.createElement('div');
            gradientOverlay.style.position = 'absolute';
            gradientOverlay.style.left = '0';
            gradientOverlay.style.right = '0';
            gradientOverlay.style.pointerEvents = 'none';
            gradientOverlay.style.height = slide.gradientHeight || '50%';

            const direction = slide.gradientDirection || 'bottom';
            const color = slide.gradientColor || '#000000';

            // Position and gradient direction based on gradientDirection
            if (direction === 'top') {
                gradientOverlay.style.top = '0';
                gradientOverlay.style.background = `linear-gradient(to bottom, ${color} 0%, rgba(0, 0, 0, 0) 100%)`;
            } else {
                gradientOverlay.style.bottom = '0';
                gradientOverlay.style.background = `linear-gradient(to top, ${color} 0%, rgba(0, 0, 0, 0) 100%)`;
            }

            box.appendChild(gradientOverlay);
        }

        const overlay = createTextOverlay(slide);
        box.appendChild(overlay);

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'overlay-button-container ' + getButtonPlacementClass(slide.button.placement);
            buttonContainer.appendChild(createButton(slide.button));
            box.appendChild(buttonContainer);
        }

        return box;
    }

    function renderBigNumber(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;

        const bigNumberBox = document.createElement('div');
        bigNumberBox.className = 'big-number-box';
        if (slide.backgroundColor) bigNumberBox.style.backgroundColor = slide.backgroundColor;

        const numberOne = document.createElement('div');
        numberOne.className = 'big-number-box-number';
        numberOne.textContent = slide.numberOne;
        if (slide.numberColor) numberOne.style.color = slide.numberColor;
        if (slide.numberFontSize) numberOne.style.fontSize = slide.numberFontSize + 'px';

        const textOne = document.createElement('div');
        textOne.className = 'big-number-box-content';
        textOne.innerHTML = formatText(slide.textOne);
        if (slide.textColor) textOne.style.color = slide.textColor;
        if (slide.textFontSize) textOne.style.fontSize = slide.textFontSize + 'px';

        const divider = document.createElement('div');
        divider.className = 'big-number-box-divider';

        const numberTwo = document.createElement('div');
        numberTwo.className = 'big-number-box-number';
        numberTwo.textContent = slide.numberTwo;
        if (slide.numberColor) numberTwo.style.color = slide.numberColor;
        if (slide.numberFontSize) numberTwo.style.fontSize = slide.numberFontSize + 'px';

        const textTwo = document.createElement('div');
        textTwo.className = 'big-number-box-content';
        textTwo.innerHTML = formatText(slide.textTwo);
        if (slide.textColor) textTwo.style.color = slide.textColor;
        if (slide.textFontSize) textTwo.style.fontSize = slide.textFontSize + 'px';

        bigNumberBox.appendChild(numberOne);
        bigNumberBox.appendChild(textOne);
        bigNumberBox.appendChild(divider);
        bigNumberBox.appendChild(numberTwo);
        bigNumberBox.appendChild(textTwo);

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'text-box-button-container';
            buttonContainer.appendChild(createButton(slide.button));
            bigNumberBox.appendChild(buttonContainer);
        }

        box.appendChild(bigNumberBox);
        return box;
    }

    function renderImageSelector(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${getSizeClasses(slide)}`;

        const selectorBox = document.createElement('div');
        selectorBox.className = 'image-selector';
        if (slide.backgroundColor) selectorBox.style.backgroundColor = slide.backgroundColor;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-selector-image-container';
        imageContainer.style.height = 'calc(100% - 100px)';
        if (slide.backgroundColor) imageContainer.style.backgroundColor = slide.backgroundColor;

        slide.images.forEach((image, index) => {
            const img = document.createElement('img');
            img.src = resolveAssetUrl(image.src);
            img.alt = image.alt;
            img.className = `image-selector-image ${index === 0 ? 'visible' : 'hidden'}`;
            if (slide.imageWidth) img.style.width = slide.imageWidth;
            else img.style.width = '100%';
            imageContainer.appendChild(img);
        });

        const textContainer = document.createElement('div');
        textContainer.className = 'image-selector-text-container';

        const currentText = document.createElement('div');
        currentText.className = 'image-selector-current-text';
        currentText.textContent = slide.images[0]?.text || '';
        if (slide.textColor) currentText.style.color = slide.textColor;
        textContainer.appendChild(currentText);

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'image-selector-dots';

        slide.images.forEach((image, index) => {
            const dot = document.createElement('div');
            dot.className = `image-selector-dot ${index === 0 ? 'active' : ''}`;
            if (slide.dotColor && index !== 0) dot.style.backgroundColor = slide.dotColor;
            if (slide.dotActiveColor && index === 0) dot.style.backgroundColor = slide.dotActiveColor;

            dot.addEventListener('click', () => {
                imageContainer.querySelectorAll('.image-selector-image').forEach(img => {
                    img.className = 'image-selector-image hidden';
                });
                imageContainer.children[index].className = 'image-selector-image visible';
                currentText.textContent = image.text;

                dotsContainer.querySelectorAll('.image-selector-dot').forEach((d, i) => {
                    d.classList.remove('active');
                    if (slide.dotColor) d.style.backgroundColor = slide.dotColor;
                });
                dot.classList.add('active');
                if (slide.dotActiveColor) dot.style.backgroundColor = slide.dotActiveColor;
            });

            dotsContainer.appendChild(dot);
        });

        selectorBox.appendChild(imageContainer);
        selectorBox.appendChild(textContainer);
        selectorBox.appendChild(dotsContainer);
        box.appendChild(selectorBox);
        return box;
    }

    function createButton(buttonConfig) {
        const button = document.createElement('a');
        button.className = 'content-button';
        button.href = buttonConfig.url || '#';
        button.target = '_blank';
        button.textContent = buttonConfig.text || 'Les mer';
        button.style.backgroundColor = buttonConfig.color || '#13264A';
        button.style.color = buttonConfig.textColor || 'white';
        return button;
    }

    function getButtonPlacementClass(placement) {
        const validPlacements = {
            'top-left': 'button-placement-top-left',
            'top-right': 'button-placement-top-right',
            'bottom-left': 'button-placement-bottom-left',
            'bottom-right': 'button-placement-bottom-right'
        };
        return validPlacements[placement] || 'button-placement-bottom-left';
    }

    function setupScrollButtons() {
        const scrollContainer = document.getElementById('scrollContainer');
        const scrollButtonLeft = document.getElementById('scrollButtonLeft');
        const scrollButtonRight = document.getElementById('scrollButtonRight');

        if (!scrollContainer || !scrollButtonLeft || !scrollButtonRight) return;

        function checkScrollButtons() {
            const hasLeftScroll = scrollContainer.scrollLeft > 0;
            const hasRightScroll = scrollContainer.scrollLeft < scrollContainer.scrollWidth - scrollContainer.clientWidth - 1;

            scrollButtonLeft.style.display = hasLeftScroll ? 'block' : 'none';
            scrollButtonRight.style.display = hasRightScroll ? 'block' : 'none';
        }

        function handleScroll(direction) {
            const slides = scrollContainer.querySelectorAll('.content-box');
            if (!slides.length) return;

            const currentScroll = scrollContainer.scrollLeft;

            if (direction === 'right') {
                // Find the next slide to the right
                let nextSlide = null;
                for (let i = 0; i < slides.length; i++) {
                    const slideLeft = slides[i].offsetLeft;
                    if (slideLeft > currentScroll + 50) {
                        nextSlide = slides[i];
                        break;
                    }
                }

                if (nextSlide) {
                    scrollContainer.scrollTo({
                        left: nextSlide.offsetLeft,
                        behavior: 'smooth'
                    });
                }
            } else {
                // Find the previous slide to the left
                let prevSlide = null;
                for (let i = slides.length - 1; i >= 0; i--) {
                    const slideLeft = slides[i].offsetLeft;
                    if (slideLeft < currentScroll - 50) {
                        prevSlide = slides[i];
                        break;
                    }
                }

                if (prevSlide) {
                    scrollContainer.scrollTo({
                        left: prevSlide.offsetLeft,
                        behavior: 'smooth'
                    });
                } else {
                    // Already at the first slide, scroll to position 0
                    scrollContainer.scrollTo({
                        left: 0,
                        behavior: 'smooth'
                    });
                }
            }
        }

        scrollButtonLeft.addEventListener('click', () => {
            stopAutoScroll();
            handleScroll('left');
            resetAutoScroll();
        });

        scrollButtonRight.addEventListener('click', () => {
            stopAutoScroll();
            handleScroll('right');
            resetAutoScroll();
        });

        scrollContainer.addEventListener('scroll', checkScrollButtons);
        checkScrollButtons();

        window.checkScrollButtons = checkScrollButtons;
    }

    let autoScrollTimer = null;
    let autoScrollInterval = null;
    let isUserInteracting = false;
    let resetTimer = null;
    let eventListenersAttached = false;
    let isAnimating = false;

    function cleanupAutoScroll() {
        // Clear timers without setting isUserInteracting
        if (autoScrollTimer) {
            clearTimeout(autoScrollTimer);
            autoScrollTimer = null;
        }
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
        eventListenersAttached = false;
    }

    function setupAutoRotate() {
        // Always cleanup first to prevent multiple timers
        cleanupAutoScroll();

        if (!config.autoRotate) return;

        const scrollContainer = document.getElementById('scrollContainer');
        if (!scrollContainer) return;

        // Reset user interaction flag for fresh start
        isUserInteracting = false;

        // Only attach event listeners once
        if (!eventListenersAttached) {
            scrollContainer.addEventListener('scroll', (e) => {
                // Ignore scroll events during our own animation
                if (isAnimating) return;

                if (e.isTrusted) {
                    stopAutoScroll();
                    resetAutoScroll();
                }
            });

            scrollContainer.addEventListener('wheel', () => {
                stopAutoScroll();
                resetAutoScroll();
            });

            scrollContainer.addEventListener('touchstart', () => {
                stopAutoScroll();
                resetAutoScroll();
            });

            scrollContainer.addEventListener('touchmove', () => {
                stopAutoScroll();
            });

            scrollContainer.addEventListener('touchend', () => {
                resetAutoScroll();
            });

            scrollContainer.addEventListener('mouseenter', () => {
                stopAutoScroll();
            });

            scrollContainer.addEventListener('mouseleave', () => {
                resetAutoScroll();
            });

            scrollContainer.addEventListener('click', () => {
                stopAutoScroll();
                resetAutoScroll();
            });

            eventListenersAttached = true;
        }

        startAutoScroll();
    }

    function startAutoScroll() {
        if (!config.autoRotate) return;

        // Schedule the next rotation
        autoScrollTimer = setTimeout(() => {
            if (!isUserInteracting && config.autoRotate) {
                performAutoScroll();
            }
        }, config.autoRotateDelay);
    }

    function stopAutoScroll() {
        isUserInteracting = true;
        if (autoScrollTimer) {
            clearTimeout(autoScrollTimer);
            autoScrollTimer = null;
        }
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
    }

    function resetAutoScroll() {
        stopAutoScroll();
        resetTimer = setTimeout(() => {
            if (config.autoRotate) {
                isUserInteracting = false;
                startAutoScroll();
            }
        }, 2000);
    }

    function performAutoScroll() {
        const scrollContainer = document.getElementById('scrollContainer');
        if (!scrollContainer) return;

        const slides = scrollContainer.querySelectorAll('.content-box');
        if (!slides.length) return;

        const currentScroll = scrollContainer.scrollLeft;

        // Find the next slide to scroll to
        let nextSlide = null;
        for (let i = 0; i < slides.length; i++) {
            const slideLeft = slides[i].offsetLeft;
            // Find the first slide that's beyond the current scroll position (with small tolerance)
            if (slideLeft > currentScroll + 50) {
                nextSlide = slides[i];
                break;
            }
        }

        // Set animating flag to prevent scroll events from interfering
        isAnimating = true;

        // If we found a next slide, scroll to it, otherwise go back to start
        if (nextSlide) {
            scrollContainer.scrollTo({
                left: nextSlide.offsetLeft,
                behavior: 'smooth'
            });
        } else {
            scrollContainer.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        }

        // Wait for scroll animation to complete before scheduling next rotation
        // Using a fixed 500ms to allow browser's smooth scroll to finish
        setTimeout(() => {
            isAnimating = false;
            if (!isUserInteracting && config.autoRotate) {
                startAutoScroll();
            }
        }, 500);
    }

    function setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
        };

        let currentlyPlayingVideo = null;
        let maxIntersection = 0;
        let videoToPlay = null;

        const handleIntersectionChanges = (entries) => {
            maxIntersection = 0;
            videoToPlay = null;

            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (!video) return;

                if (entry.isIntersecting) {
                    if (entry.intersectionRatio > maxIntersection) {
                        maxIntersection = entry.intersectionRatio;
                        videoToPlay = video;
                    }
                }
            });

            if (currentlyPlayingVideo && currentlyPlayingVideo !== videoToPlay) {
                currentlyPlayingVideo.pause();
            }

            if (videoToPlay) {
                if (videoToPlay.paused) {
                    videoToPlay.play().catch(e => console.error("Error playing video:", e));
                }
                currentlyPlayingVideo = videoToPlay;
            }
        };

        const observer = new IntersectionObserver(handleIntersectionChanges, options);

        document.querySelectorAll('.content-box').forEach(box => {
            if (box.querySelector('video')) {
                observer.observe(box);
            }
        });
    }

})();