import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge', () => {
  it('defaults to the neutral tone and sm size', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.detectChanges();
    expect(fixture.componentInstance.colors()).toEqual({ bg: '#F1F1F1', fg: '#5C5C5C' });
    expect(fixture.componentInstance.box()).toEqual({ h: '24px', pad: '0 10px' });
  });

  it('switches colors when tone changes to danger', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('tone', 'danger');
    fixture.detectChanges();
    expect(fixture.componentInstance.colors()).toEqual({ bg: '#FCE4E4', fg: '#C62828' });
  });
});
