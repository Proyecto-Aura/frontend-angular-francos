import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

describe('Modal', () => {
  function create() {
    return TestBed.createComponent(Modal);
  }

  it('onClose emits closed when closable', () => {
    const fixture = create();
    fixture.detectChanges();
    const emitted: void[] = [];
    fixture.componentInstance.closed.subscribe(() => emitted.push(undefined));

    fixture.componentInstance.onClose();
    expect(emitted.length).toBe(1);
  });

  it('onClose does not emit when closable is false', () => {
    const fixture = create();
    fixture.componentRef.setInput('closable', false);
    fixture.detectChanges();
    const emitted: void[] = [];
    fixture.componentInstance.closed.subscribe(() => emitted.push(undefined));

    fixture.componentInstance.onClose();
    expect(emitted.length).toBe(0);
  });

  it('renders the dialog only when open is true', () => {
    const fixture = create();
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
