import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: '#F1F1F1', fg: '#5C5C5C' },
  brand: { bg: 'rgba(210,43,43,0.08)', fg: '#D22B2B' },
  success: { bg: '#E4F6E8', fg: '#2E7D32' },
  warning: { bg: '#FDEFD8', fg: '#B35D00' },
  danger: { bg: '#FCE4E4', fg: '#C62828' },
  info: { bg: '#E3F0FC', fg: '#1565C0' },
};

const SIZES: Record<BadgeSize, { h: string; pad: string }> = {
  sm: { h: '24px', pad: '0 10px' },
  md: { h: '32px', pad: '0 14px' },
};

@Component({
  imports: [],
  selector: 'app-ds-badge',
  templateUrl: './badge.html',
})
export class Badge {
  tone = input<BadgeTone>('neutral');
  size = input<BadgeSize>('sm');
  dot = input(false);

  colors = computed(() => TONES[this.tone()]);
  box = computed(() => SIZES[this.size()]);
}
