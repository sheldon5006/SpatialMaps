import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface FlowDeskAiSource {
  chunkId: string;
  documentId: string;
  businessId: string;
  source: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface FlowDeskAiResponse {
  answer: string;
  sources: FlowDeskAiSource[];
}

@Injectable({
  providedIn: 'root',
})
export class FlowDeskAiService {
  private readonly http = inject(HttpClient);

  ask(message: string, topK = 5): Observable<FlowDeskAiResponse> {
    return this.http.post<FlowDeskAiResponse>('/api/ai/chat', {
      message,
      topK,
    });
  }
}
