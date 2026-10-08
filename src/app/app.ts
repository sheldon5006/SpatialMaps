import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { FlowDeskAiService } from './flowdesk-ai.service';
import { SpatialMap } from './spatial-map/spatial-map';

@Component({
  imports: [FormsModule, RouterOutlet, SpatialMap],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly flowDeskAi = inject(FlowDeskAiService);

  // Keep the AI chat hidden by default for the hosted SpatialMaps experience.
  // Set this to false when the AI panel should be enabled.
  protected readonly hideAiChat = true;

  protected aiQuestion = 'Where are fragile products stored?';
  protected readonly aiAnswer = signal('');
  protected readonly aiLoading = signal(false);
  protected readonly aiError = signal('');

  protected askFlowDeskAi(): void {
    const question = this.aiQuestion.trim();

    if (!question || this.aiLoading()) return;

    this.aiAnswer.set('');
    this.aiError.set('');
    this.aiLoading.set(true);

    this.flowDeskAi.ask(question).subscribe({
      next: (response) => {
        this.aiAnswer.set(response.answer);
        this.aiLoading.set(false);
      },
      error: (error) => {
        this.aiError.set(
          error?.error?.detail ??
            error?.error?.error ??
            'Could not reach SpatialMaps API.',
        );
        this.aiLoading.set(false);
      },
    });
  }
}
