import { Component, inject, signal, OnInit } from '@angular/core';
import { LinksService, Link } from './links.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private svc = inject(LinksService);

  urlInput  = signal('');
  links     = signal<Link[]>([]);
  created   = signal<Link | null>(null);
  error     = signal('');
  submitting = signal(false);

  ngOnInit(): void {
    this.loadLinks();
  }

  private loadLinks(): void {
    this.svc.getAll().subscribe({
      next: links => this.links.set(links),
      error: () => {},
    });
  }

  submit(): void {
    const raw = this.urlInput().trim();
    if (!this.isValidUrl(raw)) {
      this.error.set('Enter a valid http:// or https:// URL.');
      return;
    }
    this.error.set('');
    this.created.set(null);
    this.submitting.set(true);

    this.svc.create(raw).subscribe({
      next: link => {
        this.created.set(link);
        this.urlInput.set('');
        this.submitting.set(false);
        this.loadLinks();
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'Request failed — is the backend running?');
        this.submitting.set(false);
      },
    });
  }

  isValidUrl(str: string): boolean {
    try {
      const { protocol } = new URL(str);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }
}
