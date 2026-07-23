import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Link {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class SnipService {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:3000/api';

  create(url: string): Observable<Link> {
    return this.http.post<Link>(`${this.base}/links`, { url });
  }

  list(): Observable<Link[]> {
    return this.http.get<Link[]>(`${this.base}/links`);
  }
}
