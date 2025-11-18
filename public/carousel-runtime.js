// Carousel Runtime Script
// This script will be loaded from CloudFront/S3 and renders the carousel based on the provided config

(function () {
    'use strict';

    // Helper function to convert line breaks to <br> tags and preserve formatting
    function formatText(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // Load config from window.carouselConfig or fetch from window.carouselConfigUrl
    let config = window.carouselConfig;

    if (!config && window.carouselConfigUrl) {
        // Fetch config from URL
        fetch(window.carouselConfigUrl)
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
                width: ${slideHeight}px;
            }

            .double-box {
                width: ${slideHeight * 2}px;
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

                .carousel-header {
                    font-size: 12px;
                }

                .scroll-container {
                    scroll-snap-type: none;
                }

                .content-box {
                    height: ${slideHeight * 0.88}px;
                    width: ${slideHeight * 0.88}px;
                }

                .double-box {
                    width: ${slideHeight * 0.88}px;
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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;
        box.style.position = 'relative';

        const img = document.createElement('img');
        img.src = slide.src;
        img.alt = slide.alt;
        img.className = 'content-image';

        if (slide.useZoom) {
            img.classList.add('zoom-effect');
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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;
        box.style.position = 'relative';

        const img = document.createElement('img');
        img.src = slide.src;
        img.alt = slide.alt;
        img.className = 'content-image';

        if (slide.useZoom) {
            img.classList.add('zoom-effect');
        }

        const overlay = createTextOverlay(slide);

        box.appendChild(img);
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

        if (slide.gradientHeight) {
            overlay.style.height = slide.gradientHeight;
        } else {
            overlay.style.height = '120px';
        }

        if (slide.useGradient) {
            const gradient = document.createElement('div');
            gradient.className = 'gradient-overlay';
            const gradientDirection = slide.textPosition === 'top' ? 'to bottom' : 'to top';
            const color = slide.gradientColor || '#000000';
            gradient.style.background = `linear-gradient(${gradientDirection}, ${color} 0%, rgba(0, 0, 0, 0) 100%)`;
            overlay.appendChild(gradient);
        }

        if (slide.title) {
            const title = document.createElement('div');
            title.className = 'text-overlay-title';
            title.innerHTML = formatText(slide.title);
            if (slide.textWidth) title.style.maxWidth = slide.textWidth;
            if (slide.textColor) title.style.color = slide.textColor;
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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;

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

        if (slide.button) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'text-box-button-container';
            buttonContainer.appendChild(createButton(slide.button));
            textBox.appendChild(buttonContainer);
        }

        box.appendChild(textBox);
        return box;
    }

    function renderVideo(slide) {
        const box = document.createElement('div');
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;
        box.style.position = 'relative';

        const video = document.createElement('video');
        video.className = 'video-box';
        video.src = slide.src;
        if (slide.posterSrc) video.poster = slide.posterSrc;
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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;
        box.style.position = 'relative';

        const video = document.createElement('video');
        video.className = 'video-box';
        video.src = slide.src;
        if (slide.posterSrc) video.poster = slide.posterSrc;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');

        const overlay = createTextOverlay(slide);

        box.appendChild(video);
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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;

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
        box.className = `content-box ${slide.size === 'double' ? 'double-box' : ''}`;

        const selectorBox = document.createElement('div');
        selectorBox.className = 'image-selector';
        if (slide.backgroundColor) selectorBox.style.backgroundColor = slide.backgroundColor;

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-selector-image-container';
        imageContainer.style.height = 'calc(100% - 100px)';
        if (slide.backgroundColor) imageContainer.style.backgroundColor = slide.backgroundColor;

        slide.images.forEach((image, index) => {
            const img = document.createElement('img');
            img.src = image.src;
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
            const scrollAmount = scrollContainer.clientWidth * 0.8;
            scrollContainer.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
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

    function setupAutoRotate() {
        if (!config.autoRotate) return;

        const scrollContainer = document.getElementById('scrollContainer');
        if (!scrollContainer) return;

        scrollContainer.addEventListener('scroll', (e) => {
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

        startAutoScroll();
    }

    function startAutoScroll() {
        if (!config.autoRotate) return;

        autoScrollTimer = setTimeout(() => {
            if (!isUserInteracting) {
                autoScrollInterval = setInterval(() => {
                    if (!isUserInteracting) {
                        performAutoScroll();
                    }
                }, config.autoRotateSpeed);
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

        const scrollAmount = scrollContainer.clientWidth * 0.8;
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

        if (scrollContainer.scrollLeft >= maxScroll - 10) {
            scrollContainer.scrollTo({
                left: 0,
                behavior: 'smooth'
            });
        } else {
            scrollContainer.scrollBy({
                left: scrollAmount,
                behavior: 'smooth'
            });
        }
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