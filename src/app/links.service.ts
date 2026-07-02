import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private http = inject(HttpClient);

  getAll() {
    return this.http.get<Link[]>(`${API}/api/links`);
  }

  create(url: string) {
    return this.http.post<Link>(`${API}/api/links`, { url });
  }
}
