import { CommonModule } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FlickrPhoto, FlickrSearchOptions, FlickrService } from '../flickr.service';
import { environment } from "../../environments/environment.local";

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css',
})
export class EventsComponent implements OnInit, OnDestroy, AfterViewInit {
  private flickr = inject(FlickrService);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('loadingMoreElement', { static: false }) loadingMoreElement!: ElementRef<HTMLElement>;

  photos = signal<FlickrPhoto[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  error = signal<string | null>(null);
  currentPage = signal<number>(1);
  hasMorePages = signal<boolean>(true);
  totalPages = signal<number>(0);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPhotos(1);
    }
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

    const options: FlickrSearchOptions = {
      userId: environment.EPHEMERE_ACCOUNT_ID,
      sort: 'date-posted-desc',
      perPage: 20,
      page: page,
    };

    this.flickr.searchPhotos(options).subscribe({
      next: (res) => {
        const newPhotos = res.photos?.photo ?? [];
        
        if (append) {
          this.photos.update(prev => [...prev, ...newPhotos]);
        } else {
          this.photos.set(newPhotos);
        }

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

  private loadMorePhotos(): void {
    if (this.hasMorePages() && !this.loadingMore()) {
      const nextPage = this.currentPage() + 1;
      this.loadPhotos(nextPage, true);
    }
  }

  getPhotoUrl(photo: FlickrPhoto): string {
    return this.flickr.buildPhotoUrl(photo, 'z');
  }
}
