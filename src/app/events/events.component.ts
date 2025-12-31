import { CommonModule } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { FlickrPhoto, FlickrSearchOptions, FlickrService } from '../flickr.service';
import { environment } from "../../environments/environment.local";

interface Filters {
  photographerName: string;
  minDate: string;
  maxDate: string;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit, OnDestroy, AfterViewInit {
  private flickr = inject(FlickrService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('loadingMoreElement', { static: false }) loadingMoreElement!: ElementRef<HTMLElement>;

  photos = signal<FlickrPhoto[]>([]);
  filteredPhotos = signal<FlickrPhoto[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  hasMorePages = signal<boolean>(true);
  totalPages = signal<number>(0);

  // Filter properties for two-way binding
  photographerName = '';
  minDate = '';
  maxDate = '';

  getFilters(): Filters {
    return {
      photographerName: this.photographerName,
      minDate: this.minDate,
      maxDate: this.maxDate,
    };
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPhotos(1);
    }
  }

  onFiltersChange(): void {
    // Reset pagination when filters change
    this.currentPage.set(1);
    this.hasMorePages.set(true);
    this.photos.set([]);
    this.filteredPhotos.set([]);
    this.loadPhotos(1);
    
    // Scroll to events section
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const eventsSection = document.getElementById('events');
        if (eventsSection) {
          eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  clearFilters(): void {
    this.photographerName = '';
    this.minDate = '';
    this.maxDate = '';
    this.filteredPhotos.set([]);
    this.onFiltersChange();
  }

  hasActiveFilters(): boolean {
    return !!(this.photographerName.trim() || this.minDate || this.maxDate);
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  ngAfterViewInit(): void {
    // Initial check after view init
    if (isPlatformBrowser(this.platformId)) {
      this.checkLoadingMoreVisibility();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.checkLoadingMoreVisibility();
  }

  private checkLoadingMoreVisibility(): void {
    if (this.loadingMore() || !this.hasMorePages() || !this.loadingMoreElement?.nativeElement) {
      return;
    }

    const element = this.loadingMoreElement.nativeElement;
    
    // Use checkVisibility() if available, otherwise fallback to IntersectionObserver
    if ('checkVisibility' in element && typeof (element as any).checkVisibility === 'function') {
      const isVisible = (element as any).checkVisibility();
      if (isVisible) {
        this.loadMorePhotos();
      }
    } else {
      // Fallback for browsers that don't support checkVisibility()
      const rect = element.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      if (isVisible) {
        this.loadMorePhotos();
      }
    }
  }

  private loadPhotos(page: number, append: boolean = false): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    const currentFilters = this.getFilters();
    const options: FlickrSearchOptions = {
      userId: environment.EPHEMERE_ACCOUNT_ID,
      sort: 'date-posted-desc',
      perPage: 20,
      page: page,
    };

    // Add text filter if photographer name is provided
    if (currentFilters.photographerName.trim()) {
      options.text = currentFilters.photographerName.trim();
    }

    // Add date filters if provided
    if (currentFilters.minDate) {
      // Convert date to Unix timestamp
      const minDate = new Date(currentFilters.minDate);
      options.minUploadDate = Math.floor(minDate.getTime() / 1000).toString();
    }
    if (currentFilters.maxDate) {
      // Convert date to Unix timestamp (end of day)
      const maxDate = new Date(currentFilters.maxDate);
      maxDate.setHours(23, 59, 59, 999);
      options.maxUploadDate = Math.floor(maxDate.getTime() / 1000).toString();
    }

    this.flickr.searchPhotos(options).subscribe({
      next: (res) => {
        const newPhotos = res.photos?.photo ?? [];
        
        if (append) {
          this.photos.update(prev => [...prev, ...newPhotos]);
        } else {
          this.photos.set(newPhotos);
        }

        // Apply filters to all loaded photos (handles both server-side and client-side filtering)
        this.applyFilters();

        this.currentPage.set(res.photos.page);
        this.totalPages.set(res.photos.pages);
        this.hasMorePages.set(res.photos.page < res.photos.pages);
        
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des photos Flickr', err);
        this.error.set('Impossible de récupérer les photos depuis Flickr. Merci de réessayer plus tard.');
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  private filterByDateTaken(photos: FlickrPhoto[], filters: Filters): FlickrPhoto[] {
    return photos.filter(photo => {
      if (!photo.datetaken) return true;
      
      const photoDate = new Date(photo.datetaken);
      
      if (filters.minDate) {
        const minDate = new Date(filters.minDate);
        if (photoDate < minDate) return false;
      }
      
      if (filters.maxDate) {
        const maxDate = new Date(filters.maxDate);
        maxDate.setHours(23, 59, 59, 999);
        if (photoDate > maxDate) return false;
      }
      
      return true;
    });
  }

  private filterByPhotographerName(photos: FlickrPhoto[], name: string): FlickrPhoto[] {
    if (!name) return photos;
    
    const searchName = name.toLowerCase();
    return photos.filter(photo => {
      const title = (photo.title || '').toLowerCase();
      return title.includes(searchName);
    });
  }

  private applyFilters(): void {
    const allPhotos = this.photos();
    
    // If no photos, don't apply filters
    if (allPhotos.length === 0) {
      this.filteredPhotos.set([]);
      return;
    }
    
    const currentFilters = this.getFilters();
    let filtered = [...allPhotos];

    // Apply additional client-side filtering
    // (Server-side filtering is already done in the API call, but we refine client-side)
    
    // Apply date_taken filter (API uses upload date, so we filter by date_taken client-side)
    if (currentFilters.minDate || currentFilters.maxDate) {
      filtered = this.filterByDateTaken(filtered, currentFilters);
    }

    // Apply photographer name filter (refine server-side text search)
    if (currentFilters.photographerName.trim()) {
      filtered = this.filterByPhotographerName(filtered, currentFilters.photographerName.trim());
    }

    this.filteredPhotos.set(filtered);
  }

  private loadMorePhotos(): void {
    if (this.hasMorePages() && !this.loadingMore()) {
      const nextPage = this.currentPage() + 1;
      this.loadPhotos(nextPage, true);
    }
  }

  getPhotoUrl(photo: FlickrPhoto): string {
    return this.flickr.buildPhotoUrl(photo, 'z');
  }

  getDisplayPhotos(): FlickrPhoto[] {
    const allPhotos = this.photos();
    
    // If no photos loaded yet, return empty array
    if (allPhotos.length === 0) {
      return [];
    }
    
    // If filters are active, use filtered photos
    if (this.hasActiveFilters()) {
      return this.filteredPhotos();
    }
    
    // No filters active, return all photos
    return allPhotos;
  }
}
