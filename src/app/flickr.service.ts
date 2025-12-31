import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from "../environments/environment.local"; // adjust path

const FLICKR_API_KEY = environment.FLICKR_API_KEY;

const FLICKR_API_URL = 'https://api.flickr.com/services/rest/';

export type FlickrSize = 's' | 'q' | 't' | 'm' | 'n' | 'z' | 'c' | 'b' | 'h' | 'k' | 'o';

export interface FlickrSearchOptions {
  text?: string;
  userId?: string;
  minUploadDate?: string;
  maxUploadDate?: string;
  sort?: string;
  nsfw?: boolean;
  tags?: string[];
  inGallery?: boolean | null;
  perPage?: number;
  page?: number;
}

export interface FlickrPhotoset {
  id: string;
  owner: string;
  username: string;
  primary: string;
  secret: string;
  server: string;
  farm: number;
  count_views: string;
  count_comments: string;
  count_photos: string;
  count_videos: string;
  title: {
    _content: string;
  };
  description: {
    _content: string;
  };
  date_create: string;
  date_update: string;
}

export interface FlickrPhotosetsResponse {
  photosets: {
    page: number;
    pages: number;
    perpage: number;
    total: string;
    photoset: FlickrPhotoset[];
  };
}

export interface FlickrPhoto {
  id: string;
  owner: string;
  secret: string;
  server: string;
  farm: number;
  title: string;
  ownername?: string;
  datetaken?: string;
  dateupload?: string;
  ispublic: number;
  isfriend: number;
  isfamily: number;
}

export interface FlickrSearchResponse {
  photos: {
    page: number;
    pages: number;
    perpage: number;
    total: string;
    photo: FlickrPhoto[];
  };
}

export interface FlickrComment {
  id: string;
  author: string;
  authorname: string;
  _content: string;
  datecreate: string;
}

export interface FlickrGeoInfo {
  latitude?: string;
  longitude?: string;
  locality?: string;
  county?: string;
  region?: string;
  country?: string;
}

export interface FlickrPhotoDetails {
  photo: any;
}

@Injectable({
  providedIn: 'root',
})
export class FlickrService {
  private http = inject(HttpClient);

  searchPhotos(options: FlickrSearchOptions): Observable<FlickrSearchResponse> {
    let params = new HttpParams()
      .set('method', 'flickr.photos.search')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('extras', 'owner_name,date_taken,date_upload,geo,tags')
      .set('per_page', String(options.perPage ?? 30))
      .set('page', String(options.page ?? 1));

    if (options.text) {
      params = params.set('text', options.text);
    }
    if (options.userId) {
      params = params.set('user_id', options.userId);
    }
    if (options.tags && options.tags.length) {
      params = params.set('tags', options.tags.join(','));
    }
    if (options.minUploadDate) {
      params = params.set('min_upload_date', options.minUploadDate);
    }
    if (options.maxUploadDate) {
      params = params.set('max_upload_date', options.maxUploadDate);
    }
    if (options.sort) {
      params = params.set('sort', options.sort);
    }
    if (options.nsfw !== undefined) {
      params = params.set('safe_search', options.nsfw ? '3' : '1');
    }
    if (options.inGallery !== null && options.inGallery !== undefined) {
      params = params.set('in_gallery', options.inGallery ? '1' : '0');
    }

    return this.http.get<FlickrSearchResponse>(FLICKR_API_URL, { params });
  }

  getPhotosetPhotos(photosetId: string, userId: string, page: number = 1, perPage: number = 20): Observable<FlickrSearchResponse> {
    const params = new HttpParams()
      .set('method', 'flickr.photosets.getPhotos')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('photoset_id', photosetId)
      .set('user_id', userId)
      .set('extras', 'owner_name,date_taken,date_upload,geo,tags')
      .set('per_page', String(perPage))
      .set('page', String(page));

    return this.http.get<FlickrSearchResponse>(FLICKR_API_URL, { params }).pipe(
      map((res: any) => ({
        photos: {
          page: res.photoset.page,
          pages: res.photoset.pages,
          perpage: res.photoset.perpage,
          total: res.photoset.total,
          photo: res.photoset.photo || []
        }
      }))
    );
  }

  getPhotosets(userId: string): Observable<FlickrPhotosetsResponse> {
    const params = new HttpParams()
      .set('method', 'flickr.photosets.getList')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('user_id', userId)
      .set('per_page', '500');

    return this.http.get<FlickrPhotosetsResponse>(FLICKR_API_URL, { params });
  }

  getPhotoInfo(photoId: string, secret: string): Observable<any> {
    const params = new HttpParams()
      .set('method', 'flickr.photos.getInfo')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('photo_id', photoId)
      .set('secret', secret);

    return this.http.get(FLICKR_API_URL, { params });
  }

  getPhotoComments(photoId: string): Observable<FlickrComment[]> {
    const params = new HttpParams()
      .set('method', 'flickr.photos.comments.getList')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('photo_id', photoId);

    return this.http.get<any>(FLICKR_API_URL, { params }).pipe(
      map((res) => (res.comments && res.comments.comment ? res.comments.comment : [])),
    );
  }

  getOwnerPublicPhotos(userId: string, perPage = 12): Observable<FlickrPhoto[]> {
    const params = new HttpParams()
      .set('method', 'flickr.people.getPublicPhotos')
      .set('api_key', FLICKR_API_KEY)
      .set('format', 'json')
      .set('nojsoncallback', '1')
      .set('extras', 'owner_name,date_taken,date_upload')
      .set('user_id', userId)
      .set('per_page', String(perPage));

    return this.http
      .get<FlickrSearchResponse>(FLICKR_API_URL, { params })
      .pipe(map((res) => res.photos.photo));
  }

  buildPhotoUrl(photo: FlickrPhoto, size: FlickrSize = 'z'): string {
    // see: https://www.flickr.com/services/api/misc.urls.html
    return `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
  }
}


