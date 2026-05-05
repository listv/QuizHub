import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, of, shareReplay, tap } from 'rxjs';

// Global cache — shared across pipe instances
const imageCache = new Map<string, Observable<SafeUrl>>();
const objectUrls: string[] = [];

@Pipe({
  name: 'secureImage',
  standalone: true
})
export class SecureImagePipe implements PipeTransform, OnDestroy {
  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  transform(url: string | null | undefined): Observable<SafeUrl> {
    if (!url) return of('');

    // Return cached observable if available
    if (imageCache.has(url)) {
      return imageCache.get(url)!;
    }

    const obs = this.http.get(url, { responseType: 'blob' }).pipe(
      map(blob => {
        const objectUrl = URL.createObjectURL(blob);
        objectUrls.push(objectUrl);
        return this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      }),
      shareReplay(1) // Cache the result
    );

    imageCache.set(url, obs);
    return obs;
  }

  ngOnDestroy() {
    // Cleanup only when pipe is destroyed (component unmount)
    // Don't clear global cache — it persists for session
  }
}

// Call this on logout to free memory
export function clearImageCache() {
  imageCache.clear();
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls.length = 0;
}
