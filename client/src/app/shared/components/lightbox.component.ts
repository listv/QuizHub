import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="overlay" (click)="close()">
        <button class="close-btn" (click)="close()">✕</button>
        <img [src]="imageSrc()" alt="" class="zoomed-img" (click)="$event.stopPropagation()">
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,.85); z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      cursor: zoom-out; animation: fadeIn .2s ease;
    }
    .zoomed-img {
      max-width: 90vw; max-height: 90vh;
      border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
      cursor: default; animation: scaleIn .2s ease;
    }
    .close-btn {
      position: fixed; top: 16px; right: 16px;
      background: rgba(255,255,255,.15); color: #fff;
      border: none; border-radius: 50%; width: 40px; height: 40px;
      font-size: 20px; cursor: pointer; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
    }
    .close-btn:hover { background: rgba(255,255,255,.3); }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes scaleIn { from { transform: scale(.9); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  `]
})
export class LightboxComponent {
  visible = signal(false);
  imageSrc = signal('');

  open(src: string) {
    this.imageSrc.set(src);
    this.visible.set(true);
  }

  close() {
    this.visible.set(false);
  }
}
