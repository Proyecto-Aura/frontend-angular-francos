import { Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg';

const BOX: Record<AvatarSize, number> = { sm: 28, md: 32, lg: 40 };

@Component({
  imports: [],
  selector: 'app-ds-avatar',
  templateUrl: './avatar.html',
})
export class Avatar {
  name = input('');
  src = input<string | null>(null);
  size = input<AvatarSize>('md');

  box = computed(() => BOX[this.size()]);

  initials = computed(() =>
    this.name()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );
}
