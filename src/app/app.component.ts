import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { SnipService, Link } from './snip.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly svc = inject(SnipService);

  inputUrl = signal('');
  urlError = signal('');
  apiError = signal('');
  newLink = signal<Link | null>(null);
  links = signal<Link[]>([]);
  loading = signal(false);

  ngOnInit(): void {
    this.refresh();
  }

  private isValidUrl(raw: string): boolean {
    try {
      const u = new URL(raw);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  refresh(): void {
    this.svc.list().subscribe({
      next: (data) => this.links.set(data),
      error: () => {}
    });
  }

  submit(): void {
    const url = this.inputUrl().trim();
    this.urlError.set('');
    this.apiError.set('');
    this.newLink.set(null);

    if (!url) {
      this.urlError.set('Please enter a URL.');
      return;
    }
    if (!this.isValidUrl(url)) {
      this.urlError.set('Must be a valid http:// or https:// URL.');
      return;
    }

    this.loading.set(true);
    this.svc.create(url).subscribe({
      next: (link) => {
        this.newLink.set(link);
        this.inputUrl.set('');
        this.loading.set(false);
        this.refresh();
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.error ?? err.message ?? 'Unknown error';
        this.apiError.set(`Error ${err.status}: ${msg}`);
        this.loading.set(false);
      }
    });
  }
}
