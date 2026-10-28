import { Pipe, PipeTransform } from '@angular/core';

/** Turns an enum constant such as PAYMENT_PENDING into "Payment pending". */
@Pipe({ name: 'humanize', standalone: true })
export class HumanizePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const text = value.replace(/_/g, ' ').toLowerCase();
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}

/** Maps a status to a badge tone used by the global stylesheet. */
export function statusTone(status: string | null | undefined): 'ok' | 'warn' | 'err' | 'info' | 'muted' {
  switch (status) {
    case 'PAID':
    case 'ACTIVE':
    case 'SERVED':
    case 'READY':
    case 'CLOSED':
    case 'ENABLED':
      return 'ok';
    case 'UNPAID':
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PAYMENT_PENDING':
    case 'BILL_GENERATED':
    case 'ACCEPTED':
    case 'COOKING':
      return 'warn';
    case 'CANCELLED':
    case 'REJECTED':
    case 'EXPIRED':
    case 'DISABLED':
      return 'err';
    case 'ORDERED':
    case 'OPEN':
      return 'info';
    default:
      return 'muted';
  }
}

/** Local calendar date formatted as YYYY-MM-DD. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
