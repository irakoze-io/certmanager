import { Component, input, effect, signal, OnDestroy, ElementRef, ViewChild, afterNextRender, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js - use local worker file for better reliability
if (typeof window !== 'undefined') {
  // Try local worker first (most reliable)
  // Fallback to unpkg CDN (more reliable than cdnjs)
  // Final fallback to cdnjs
  const workerSources = [
    '/pdf.worker.min.mjs', // Local file
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`, // unpkg CDN
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js` // cdnjs fallback
  ];
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSources[0];
  console.log('[PDF Viewer] PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.css'
})
export class PdfViewerComponent implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef<HTMLDivElement>;

  pdfUrl = input.required<string>();
  scale = input<number>(1.0);

  // Writable signal for scale (can be modified by zoom controls)
  // This is separate from the input to allow modifications
  currentScale = signal<number>(1.0);

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  totalPages = signal<number>(0);
  pdfDocument = signal<any>(null);

  // Expose Math for template
  Math = Math;

  private currentPdf: any = null;
  private isViewInitialized = false;

  constructor() {
    // Initialize scale from input
    this.currentScale.set(this.scale());

    afterNextRender(() => {
      this.isViewInitialized = true;
      console.log('[PDF Viewer] View initialized');
      // Load PDF after view is initialized
      const url = this.pdfUrl();
      console.log('[PDF Viewer] Initial URL:', url);
      if (url) {
        setTimeout(() => {
          console.log('[PDF Viewer] Loading PDF after view initialization...');
          this.loadPdf(url);
        }, 100); // Small delay to ensure DOM is ready
      }
    });

    // Watch for URL changes
    effect(() => {
      const url = this.pdfUrl();
      console.log('[PDF Viewer] URL changed:', url, 'View initialized:', this.isViewInitialized);
      if (url && this.isViewInitialized) {
        // Small delay to ensure view is ready
        setTimeout(() => {
          console.log('[PDF Viewer] Loading PDF from effect...');
          this.loadPdf(url);
        }, 0);
      } else if (url && !this.isViewInitialized) {
        console.log('[PDF Viewer] URL set but view not initialized yet, will load after initialization');
      }
    });

    // Watch for scale input changes and update writable signal
    effect(() => {
      const inputScale = this.scale();
      this.currentScale.set(inputScale);
    });

    // Watch for scale changes and re-render current page
    effect(() => {
      const scale = this.currentScale();
      const pdf = this.pdfDocument();
      if (pdf && this.isViewInitialized && this.currentPage() > 0) {
        // Re-render current page with new scale
        setTimeout(() => this.renderPage(this.currentPage()), 0);
      }
    });
  }

  ngOnInit(): void {
    // Component initialized
  }

  ngOnDestroy(): void {
    if (this.currentPdf) {
      this.currentPdf.destroy();
      this.currentPdf = null;
    }
  }

  private async loadPdf(url: string): Promise<void> {
    try {
      console.log('[PDF Viewer] Loading PDF from URL:', url);
      this.isLoading.set(true);
      this.error.set(null);

      // Check if worker is loaded
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        console.error('[PDF Viewer] PDF.js worker not configured');
        this.error.set('PDF.js worker not configured');
        this.isLoading.set(false);
        return;
      }

      console.log('[PDF Viewer] PDF.js worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        withCredentials: false,
        httpHeaders: {},
        // Enable CORS
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      });

      loadingTask.onProgress = (progress: any) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log('[PDF Viewer] Loading progress:', percent + '%');
        }
      };

      const pdf = await loadingTask.promise;
      console.log('[PDF Viewer] PDF loaded successfully. Pages:', pdf.numPages);
      
      this.currentPdf = pdf;
      this.pdfDocument.set(pdf);
      this.totalPages.set(pdf.numPages);
      this.currentPage.set(1);

      // Wait a bit for view to be ready, then render first page
      await new Promise(resolve => setTimeout(resolve, 100));
      await this.renderPage(1);
      this.isLoading.set(false);
      console.log('[PDF Viewer] PDF rendering complete');
    } catch (err: any) {
      console.error('[PDF Viewer] Error loading PDF:', err);
      console.error('[PDF Viewer] Error details:', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
      
      let errorMessage = 'Failed to load PDF';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.name) {
        errorMessage = `${err.name}: Failed to load PDF`;
      }
      
      // Provide more specific error messages
      if (err?.message?.includes('CORS')) {
        errorMessage = 'CORS error: PDF cannot be loaded due to cross-origin restrictions';
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        errorMessage = 'Network error: Unable to fetch PDF. Please check the URL and try again.';
      } else if (err?.message?.includes('Invalid PDF')) {
        errorMessage = 'Invalid PDF format: The file may be corrupted or not a valid PDF.';
      }
      
      this.error.set(errorMessage);
      this.isLoading.set(false);
    }
  }

  private async renderPage(pageNumber: number): Promise<void> {
    const pdf = this.pdfDocument();
    if (!pdf) {
      console.warn('[PDF Viewer] Cannot render page: PDF document not loaded');
      return;
    }

    // Wait for view to be initialized
    if (!this.canvasContainer) {
      console.log('[PDF Viewer] Canvas container not ready, retrying...');
      setTimeout(() => this.renderPage(pageNumber), 100);
      return;
    }

    try {
      console.log(`[PDF Viewer] Rendering page ${pageNumber}...`);
      const page = await pdf.getPage(pageNumber);
      const scale = this.currentScale();
      const viewport = page.getViewport({ scale });

      // Clear container
      const container = this.canvasContainer.nativeElement;
      if (!container) {
        console.error('[PDF Viewer] Canvas container element not found');
        return;
      }
      
      container.innerHTML = '';

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'pdf-canvas';

      console.log(`[PDF Viewer] Canvas size: ${canvas.width}x${canvas.height}, scale: ${scale}`);

      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      await renderTask.promise;
      container.appendChild(canvas);
      console.log(`[PDF Viewer] Page ${pageNumber} rendered successfully`);
    } catch (err: any) {
      console.error(`[PDF Viewer] Error rendering page ${pageNumber}:`, err);
      this.error.set(err.message || `Failed to render PDF page ${pageNumber}`);
    }
  }

  async goToPage(pageNumber: number): Promise<void> {
    const total = this.totalPages();
    if (pageNumber < 1 || pageNumber > total) {
      return;
    }

    this.currentPage.set(pageNumber);
    await this.renderPage(pageNumber);
  }

  async previousPage(): Promise<void> {
    const current = this.currentPage();
    if (current > 1) {
      await this.goToPage(current - 1);
    }
  }

  async nextPage(): Promise<void> {
    const current = this.currentPage();
    const total = this.totalPages();
    if (current < total) {
      await this.goToPage(current + 1);
    }
  }

  async zoomIn(): Promise<void> {
    const newScale = Math.min(this.currentScale() + 0.25, 3.0);
    this.currentScale.set(newScale);
    await this.renderPage(this.currentPage());
  }

  async zoomOut(): Promise<void> {
    const newScale = Math.max(this.currentScale() - 0.25, 0.5);
    this.currentScale.set(newScale);
    await this.renderPage(this.currentPage());
  }
}
