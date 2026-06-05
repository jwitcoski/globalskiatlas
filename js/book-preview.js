/**
 * Renders sample book chapter PDFs as a draggable page-flip preview.
 */
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const CHAPTERS = {
    vermont: {
        label: 'Vermont',
        pdf: './assets/book-preview/vermont-chapter.pdf',
        subtitle: 'Previewing Vermont · Volume 1 (North America)',
    },
    colorado: {
        label: 'Colorado',
        pdf: './assets/book-preview/colorado-chapter.pdf',
        subtitle: 'Previewing Colorado · Volume 1 (North America)',
    },
};

const DEFAULT_SUBTITLE = 'Volume 1 (North America) — choose a state chapter below';
const MAX_RENDER_SCALE = 6;
const JPEG_QUALITY = 0.93;

let pageFlip = null;
let activeChapterId = null;
let resizeHandler = null;
let isFullscreen = false;
let viewerAnchor = null;
let previewMountEl = null;
let zoomMode = 'standard';

const ZOOM_STANDARD_NORMAL = 1.25;
const ZOOM_STANDARD_FULLSCREEN = 2;
const ZOOM_PAGE_WIDTH = 5;

function getActualZoom() {
    if (zoomMode === 'pageWidth') {
        return ZOOM_PAGE_WIDTH;
    }
    return isFullscreen ? ZOOM_STANDARD_FULLSCREEN : ZOOM_STANDARD_NORMAL;
}

/** PDF raster scale — high enough that CSS zoom stays sharp (especially Page width). */
function getRenderScale(mode = zoomMode) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssZoom = mode === 'pageWidth' ? ZOOM_PAGE_WIDTH : ZOOM_STANDARD_FULLSCREEN;
    return Math.min(MAX_RENDER_SCALE, 1.12 * dpr * cssZoom);
}

function getZoomInner(mountEl) {
    return mountEl?.querySelector('#book-preview-zoom-inner') ?? mountEl;
}

function updateZoomControls(elements) {
    const { zoomStandardBtn, zoomPageWidthBtn } = elements;
    const isStandard = zoomMode === 'standard';

    zoomStandardBtn?.classList.toggle('is-active-zoom', isStandard);
    zoomStandardBtn?.setAttribute('aria-pressed', isStandard ? 'true' : 'false');

    zoomPageWidthBtn?.classList.toggle('is-active-zoom', !isStandard);
    zoomPageWidthBtn?.setAttribute('aria-pressed', !isStandard ? 'true' : 'false');
}

function syncPageFlipInteraction() {
    if (!pageFlip) {
        return;
    }

    try {
        const settings = pageFlip.getSettings();
        // Mouse drag conflicts with panning while zoomed; use buttons/keys to turn pages.
        settings.useMouseEvents = false;
        settings.disableFlipByClick = true;
        settings.showPageCorners = false;
    } catch (error) {
        console.warn('Could not update page flip interaction settings', error);
    }
}

function applyZoom(elements) {
    const { zoomInner, zoomViewport, bookEl } = elements;
    if (!zoomInner) {
        return;
    }

    const actualZoom = getActualZoom();

    if (typeof CSS !== 'undefined' && CSS.supports('zoom', '1.5')) {
        zoomInner.style.zoom = String(actualZoom);
        zoomInner.style.transform = '';
        zoomInner.style.width = '';
        zoomInner.style.height = '';
    } else {
        zoomInner.style.zoom = '';
        zoomInner.style.transform = `scale(${actualZoom})`;
        if (bookEl) {
            zoomInner.style.width = `${bookEl.offsetWidth * actualZoom}px`;
            zoomInner.style.height = `${bookEl.offsetHeight * actualZoom}px`;
        }
    }

    zoomViewport?.classList.toggle('is-zoomed', actualZoom > 1);
    syncPageFlipInteraction();
    updateZoomControls(elements);
    refreshPageFlipLayout();
}

function setZoomMode(mode, elements, resetScroll = true) {
    zoomMode = mode === 'pageWidth' ? 'pageWidth' : 'standard';
    if (resetScroll && elements.zoomViewport) {
        elements.zoomViewport.scrollTop = 0;
        elements.zoomViewport.scrollLeft = 0;
    }
    applyZoom(elements);
    rerenderForZoomModeIfNeeded(elements);
}

function resetZoom(elements) {
    setZoomMode('standard', elements, true);
}

function initZoomInteractions(elements) {
    const { zoomViewport } = elements;
    if (!zoomViewport) {
        return;
    }

    let panState = null;

    zoomViewport.addEventListener('mousedown', (event) => {
        if (event.button !== 0 || getActualZoom() <= 1) {
            return;
        }

        panState = {
            x: event.clientX,
            y: event.clientY,
            scrollLeft: zoomViewport.scrollLeft,
            scrollTop: zoomViewport.scrollTop,
            active: false,
        };
    }, { capture: true });

    window.addEventListener('mousemove', (event) => {
        if (!panState) {
            return;
        }

        const deltaX = event.clientX - panState.x;
        const deltaY = event.clientY - panState.y;

        if (!panState.active) {
            if (Math.hypot(deltaX, deltaY) < 6) {
                return;
            }
            panState.active = true;
            zoomViewport.classList.add('is-dragging');
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        zoomViewport.scrollLeft = panState.scrollLeft - deltaX;
        zoomViewport.scrollTop = panState.scrollTop - deltaY;
    }, { capture: true });

    window.addEventListener('mouseup', (event) => {
        if (!panState) {
            return;
        }

        if (panState.active) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }

        panState = null;
        zoomViewport.classList.remove('is-dragging');
    }, { capture: true });
}

function rememberViewerAnchor(viewerEl) {
    if (!viewerEl || viewerAnchor) {
        return;
    }

    viewerAnchor = {
        parent: viewerEl.parentElement,
        nextSibling: viewerEl.nextElementSibling,
    };
}

function mountViewer(viewerEl) {
    rememberViewerAnchor(viewerEl);
    document.body.appendChild(viewerEl);
}

function restoreViewer(viewerEl) {
    if (!viewerEl || !viewerAnchor?.parent) {
        return;
    }

    const { parent, nextSibling } = viewerAnchor;
    if (nextSibling && nextSibling.parentElement === parent) {
        parent.insertBefore(viewerEl, nextSibling);
    } else {
        parent.appendChild(viewerEl);
    }
}

function getPageFlipBounds() {
    let maxWidth = Math.min(window.innerWidth * 0.94, 1800);
    let maxHeight = Math.min(window.innerHeight * 0.58, 1400);

    if (isFullscreen && previewMountEl) {
        const mountWidth = previewMountEl.clientWidth;
        const mountHeight = previewMountEl.clientHeight;

        if (mountWidth > 0) {
            maxWidth = Math.min(mountWidth * 0.96, 1800);
        }
        if (mountHeight > 0) {
            maxHeight = Math.min(mountHeight * 0.96, 1400);
        }
    }

    return {
        maxWidth,
        maxHeight,
        // Always use landscape spreads so chapter pages display side by side.
        usePortrait: false,
    };
}

function refreshPageFlipLayout() {
    requestAnimationFrame(() => {
        pageFlip?.update();
    });
}

function rebuildPageFlipLayout() {
    if (!pageFlip) {
        refreshPageFlipLayout();
        return;
    }

    try {
        const bounds = getPageFlipBounds();
        const settings = pageFlip.getSettings();
        settings.maxWidth = bounds.maxWidth;
        settings.maxHeight = bounds.maxHeight;
        settings.usePortrait = bounds.usePortrait;
    } catch (error) {
        console.warn('Could not update page flip settings', error);
    }

    refreshPageFlipLayout();
}

function setFullscreen(enabled, elements) {
    const { viewerEl, fullscreenBtn } = elements;
    if (!viewerEl || enabled === isFullscreen) {
        return;
    }

    isFullscreen = enabled;

    if (enabled) {
        mountViewer(viewerEl);
    } else {
        restoreViewer(viewerEl);
    }

    viewerEl.classList.toggle('is-fullscreen', enabled);
    document.body.classList.toggle('book-preview-fullscreen-open', enabled);

    if (fullscreenBtn) {
        fullscreenBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        fullscreenBtn.setAttribute('aria-label', enabled ? 'Exit fullscreen preview' : 'Open fullscreen preview');
        fullscreenBtn.innerHTML = enabled
            ? '<i class="bi bi-fullscreen-exit" aria-hidden="true"></i> Exit fullscreen'
            : '<i class="bi bi-arrows-fullscreen" aria-hidden="true"></i> Fullscreen';
        fullscreenBtn.classList.toggle('is-active-fullscreen', enabled);
    }

    rebuildPageFlipLayout();
    applyZoom(elements);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            rebuildPageFlipLayout();
            applyZoom(elements);
        });
    });
}

function toggleFullscreen(elements) {
    setFullscreen(!isFullscreen, elements);
}

async function renderPageImage(pdf, pageNumber, scale) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const image = document.createElement('img');
    image.src = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    image.alt = `Page ${pageNumber}`;
    image.draggable = false;
    return { image, width: viewport.width, height: viewport.height };
}

let cachedPdf = null;
let cachedRenderScale = 0;
let cachedChapterLabel = '';

async function rerenderForZoomModeIfNeeded(elements) {
    const targetScale = getRenderScale();
    if (!cachedPdf || !pageFlip || targetScale <= cachedRenderScale + 0.05) {
        return;
    }

    const { loadingEl, loadingTextEl, bookEl } = elements;
    const images = bookEl?.querySelectorAll('.book-preview-page img');
    if (!images?.length) {
        return;
    }

    loadingEl.hidden = false;
    if (loadingTextEl) {
        loadingTextEl.textContent = `Sharpening ${cachedChapterLabel} for ${zoomMode === 'pageWidth' ? 'Page width' : '100%'}…`;
    }

    try {
        for (let pageNumber = 1; pageNumber <= images.length; pageNumber += 1) {
            if (loadingTextEl) {
                loadingTextEl.textContent =
                    `Sharpening ${cachedChapterLabel} — page ${pageNumber} of ${images.length}…`;
            }
            const rendered = await renderPageImage(cachedPdf, pageNumber, targetScale);
            images[pageNumber - 1].src = rendered.image.src;
        }
        cachedRenderScale = targetScale;
        refreshPageFlipLayout();
    } catch (error) {
        console.error('Failed to sharpen chapter pages', error);
    } finally {
        loadingEl.hidden = true;
    }
}

function updateControls(pageFlipInstance, totalPages, indicator, prevBtn, nextBtn) {
    const leftIndex = pageFlipInstance.getCurrentPageIndex();
    const isLandscape = pageFlipInstance.getOrientation() === 'landscape';
    const rightIndex = leftIndex + 1;

    if (isLandscape && rightIndex < totalPages) {
        indicator.textContent = `${String(leftIndex).padStart(2, '0')} – ${String(rightIndex).padStart(2, '0')}`;
    } else {
        indicator.textContent = `${String(leftIndex).padStart(2, '0')} / ${String(totalPages - 1).padStart(2, '0')}`;
    }

    prevBtn.disabled = leftIndex <= 0;
    nextBtn.disabled = leftIndex >= totalPages - 1;
}

function setChapterButtonsDisabled(disabled) {
    document.querySelectorAll('.book-preview-chapter-btn').forEach((button) => {
        button.disabled = disabled;
    });
}

function setActiveChapterButton(chapterId) {
    document.querySelectorAll('.book-preview-chapter-btn').forEach((button) => {
        const isActive = button.dataset.chapter === chapterId;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function createBookElement(mountEl) {
    const parent = getZoomInner(mountEl);
    const bookEl = document.createElement('div');
    bookEl.id = 'book-preview';
    bookEl.className = 'book-preview';
    bookEl.hidden = true;
    parent.appendChild(bookEl);
    return bookEl;
}

function resetBookElement(mountEl) {
    if (pageFlip) {
        // PageFlip.destroy() removes its root element from the DOM.
        pageFlip.destroy();
        pageFlip = null;
    } else {
        getZoomInner(mountEl).replaceChildren();
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }

    return createBookElement(mountEl);
}

async function loadChapter(chapterId, elements) {
    const {
        mountEl,
        loadingEl,
        loadingTextEl,
        prevBtn,
        nextBtn,
        indicator,
        subtitleEl,
    } = elements;

    const chapter = CHAPTERS[chapterId];
    if (!chapter || (chapterId === activeChapterId && pageFlip)) {
        return;
    }

    const previousChapterId = activeChapterId;
    resetZoom(elements);
    const bookEl = resetBookElement(mountEl);
    elements.bookEl = bookEl;

    setActiveChapterButton(chapterId);
    if (subtitleEl) {
        subtitleEl.textContent = chapter.subtitle;
    }

    loadingEl.hidden = false;
    if (loadingTextEl) {
        loadingTextEl.textContent = `Preparing ${chapter.label} chapter…`;
    }
    setChapterButtonsDisabled(true);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    indicator.textContent = '—';

    try {
        const pdf = await pdfjsLib.getDocument(chapter.pdf).promise;
        cachedPdf = pdf;
        cachedChapterLabel = chapter.label;
        cachedRenderScale = getRenderScale();
        const totalPages = pdf.numPages;
        const pageElements = [];
        let pageWidth = 400;
        let pageHeight = 550;
        const bounds = getPageFlipBounds();

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
            if (loadingTextEl) {
                loadingTextEl.textContent = `Loading ${chapter.label} — page ${pageNumber} of ${totalPages}…`;
            }

            const rendered = await renderPageImage(pdf, pageNumber, cachedRenderScale);
            if (pageNumber === 1) {
                pageWidth = rendered.width;
                pageHeight = rendered.height;
            }

            const pageDiv = document.createElement('div');
            pageDiv.className = 'book-preview-page';
            if (pageNumber === totalPages) {
                pageDiv.dataset.density = 'hard';
            }
            pageDiv.appendChild(rendered.image);
            pageElements.push(pageDiv);
            bookEl.appendChild(pageDiv);
        }

        loadingEl.hidden = true;
        bookEl.hidden = false;

        pageFlip = new St.PageFlip(bookEl, {
            width: pageWidth,
            height: pageHeight,
            size: 'stretch',
            minWidth: 260,
            maxWidth: bounds.maxWidth,
            minHeight: 360,
            maxHeight: bounds.maxHeight,
            showCover: false,
            startPage: 0,
            maxShadowOpacity: 0.45,
            mobileScrollSupport: false,
            usePortrait: bounds.usePortrait,
            drawShadow: true,
            flippingTime: 700,
            useMouseEvents: false,
            disableFlipByClick: true,
            showPageCorners: false,
        });

        pageFlip.loadFromHTML(pageElements);
        pageFlip.turnToPage(0);
        updateControls(pageFlip, totalPages, indicator, prevBtn, nextBtn);

        pageFlip.on('init', () => {
            pageFlip.turnToPage(0);
            elements.bookEl = bookEl;
            updateControls(pageFlip, totalPages, indicator, prevBtn, nextBtn);
            applyZoom(elements);
            refreshPageFlipLayout();
        });

        pageFlip.on('flip', () => {
            updateControls(pageFlip, totalPages, indicator, prevBtn, nextBtn);
        });

        pageFlip.on('changeState', () => {
            updateControls(pageFlip, totalPages, indicator, prevBtn, nextBtn);
        });

        pageFlip.on('changeOrientation', () => {
            pageFlip.turnToPage(pageFlip.getCurrentPageIndex());
            updateControls(pageFlip, totalPages, indicator, prevBtn, nextBtn);
            refreshPageFlipLayout();
        });

        resizeHandler = () => {
            if (pageFlip) {
                rebuildPageFlipLayout();
            }
        };
        window.addEventListener('resize', resizeHandler);
        activeChapterId = chapterId;

        applyZoom(elements);
        refreshPageFlipLayout();
    } catch (error) {
        console.error('Book preview failed to load', error);
        cachedPdf = null;
        cachedRenderScale = 0;
        bookEl.hidden = true;
        loadingEl.hidden = false;
        if (previousChapterId) {
            setActiveChapterButton(previousChapterId);
            if (subtitleEl) {
                subtitleEl.textContent = CHAPTERS[previousChapterId]?.subtitle ?? DEFAULT_SUBTITLE;
            }
        } else if (subtitleEl) {
            subtitleEl.textContent = DEFAULT_SUBTITLE;
        }
        if (loadingTextEl) {
            loadingTextEl.textContent =
                `Could not load the ${chapter.label} chapter. The preview PDF may be missing from assets/book-preview/.`;
        }
    } finally {
        setChapterButtonsDisabled(false);
    }
}

function initBookPreview() {
    const viewerEl = document.getElementById('book-preview-viewer');
    const mountEl = document.getElementById('book-preview-mount');
    const loadingEl = document.getElementById('book-preview-loading');
    const loadingTextEl = document.getElementById('book-preview-loading-text');
    const prevBtn = document.getElementById('book-preview-prev');
    const nextBtn = document.getElementById('book-preview-next');
    const fullscreenBtn = document.getElementById('book-preview-fullscreen');
    const zoomStandardBtn = document.getElementById('book-preview-zoom-standard');
    const zoomPageWidthBtn = document.getElementById('book-preview-zoom-page-width');
    const zoomViewport = document.getElementById('book-preview-zoom-viewport');
    const zoomInner = document.getElementById('book-preview-zoom-inner');
    const indicator = document.getElementById('book-preview-indicator');
    const subtitleEl = document.getElementById('book-preview-subtitle');

    if (!viewerEl || !mountEl || !loadingEl || typeof St === 'undefined' || !St.PageFlip) {
        if (loadingTextEl) {
            loadingTextEl.textContent = 'Preview unavailable in this browser.';
        }
        return;
    }

    const elements = {
        viewerEl,
        mountEl,
        zoomViewport,
        zoomInner,
        bookEl: zoomInner?.querySelector('#book-preview'),
        loadingEl,
        loadingTextEl,
        prevBtn,
        nextBtn,
        fullscreenBtn,
        zoomStandardBtn,
        zoomPageWidthBtn,
        indicator,
        subtitleEl,
    };

    rememberViewerAnchor(viewerEl);
    previewMountEl = mountEl;
    initZoomInteractions(elements);
    updateZoomControls(elements);

    const controlsEl = document.querySelector('.book-preview-controls');
    controlsEl?.addEventListener('mousedown', (event) => event.stopPropagation());
    controlsEl?.addEventListener('touchstart', (event) => event.stopPropagation(), { passive: true });
    controlsEl?.addEventListener('click', (event) => event.stopPropagation());

    document.querySelectorAll('.book-preview-chapter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const chapterId = button.dataset.chapter;
            if (chapterId) {
                loadChapter(chapterId, elements);
            }
        });
    });

    prevBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        pageFlip?.flipPrev('bottom');
    });
    nextBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        pageFlip?.flipNext('bottom');
    });
    fullscreenBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen(elements);
    });

    zoomStandardBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setZoomMode('standard', elements);
    });
    zoomPageWidthBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setZoomMode('pageWidth', elements);
    });

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isFullscreen) {
            setFullscreen(false, elements);
            return;
        }

        if (!pageFlip || event.target.closest('input, textarea, select')) {
            return;
        }
        if (event.key === 'ArrowLeft') {
            pageFlip.flipPrev('bottom');
        } else if (event.key === 'ArrowRight') {
            pageFlip.flipNext('bottom');
        } else if (event.key === 'f' || event.key === 'F') {
            toggleFullscreen(elements);
        }
    });

    loadChapter('vermont', elements);
}

initBookPreview();
