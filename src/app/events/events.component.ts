import { CommonModule } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
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
export class EventsComponent {
  private flickr = inject(FlickrService);
  private platformId = inject(PLATFORM_ID);

  lastPhoto = signal<FlickrPhoto | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadLastPhoto();
    }
  }

  private loadLastPhoto(): void {
    this.loading.set(true);
    this.error.set(null);

    const options: FlickrSearchOptions = {
      userId: environment.EPHEMERE_ACCOUNT_ID, // Asso Ephemere account
      sort: 'date-posted-desc',
      perPage: 1,
      page: 1,
    };

    this.flickr.searchPhotos(options).subscribe({
      next: (res) => {
        const photo = res.photos?.photo?.[0] ?? null;
        this.lastPhoto.set(photo);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération de la dernière photo Flickr', err);
        this.lastPhoto.set(null);
        this.error.set('Impossible de récupérer la dernière photo depuis Flickr. Merci de réessayer plus tard.');
        this.loading.set(false);
      },
    });
  }

  getPhotoUrl(photo: FlickrPhoto): string {
    return this.flickr.buildPhotoUrl(photo, 'z');
  }
}
