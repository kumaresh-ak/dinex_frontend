import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { FeedbackView } from '../../core/models';

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Feedback</h1>
        <p class="muted">Ratings and comments guests left after paying their bill.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <section class="stats">
      <div class="stat">
        <span>Average rating</span>
        <strong>{{ average() }}</strong>
        <small>Out of 5</small>
      </div>
      <div class="stat">
        <span>Responses</span>
        <strong>{{ feedback().length }}</strong>
        <small>Most recent 100 shown</small>
      </div>
    </section>

    <section class="card">
      <ul class="plain">
        @for (item of feedback(); track item.id) {
          <li class="feedback">
            <div class="row between">
              <strong [attr.aria-label]="item.rating + ' out of 5'">{{ stars(item.rating) }}</strong>
              <span class="small muted">{{ item.createdAt | date: 'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <div class="small muted">{{ item.sessionNumber }}{{ item.tableNumber ? ' · Table ' + item.tableNumber : '' }}</div>
            @if (item.comments) {
              <p>{{ item.comments }}</p>
            }
          </li>
        } @empty {
          <li class="muted">No feedback yet.</li>
        }
      </ul>
    </section>
  `,
})
export class FeedbackPageComponent implements OnInit {
  private readonly api = inject(HotelApi);

  readonly feedback = signal<FeedbackView[]>([]);
  readonly error = signal<string | null>(null);

  readonly average = computed(() => {
    const list = this.feedback();
    if (list.length === 0) {
      return '-';
    }
    const total = list.reduce((sum, item) => sum + item.rating, 0);
    return (total / list.length).toFixed(1);
  });

  ngOnInit(): void {
    this.api.feedback().subscribe({
      next: feedback => this.feedback.set(feedback),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Feedback could not be loaded.')),
    });
  }

  stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }
}
