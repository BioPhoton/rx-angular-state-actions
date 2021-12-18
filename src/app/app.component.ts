import {Component} from '@angular/core';
import {RxActionsFactory} from './actions';
import {coerceNumberProperty} from "@angular/cdk/coercion";

interface UIActions {
  search: string;
  count: number;
}

function coerceEventValue<F = any>(e: any, fallback?: F): string | F {
  const _e = e as any;
  if (_e?.target?.value !== undefined) {
    return _e?.target?.value + '';
  }
  return fallback !== undefined ? fallback : _e;
}

function coerceString(e: Event | string | number): string {
  return coerceEventValue(e, +e + '');
}

function coerceNumber(e: Event | string | number): number {
  return coerceNumberProperty(coerceEventValue(e, +e + ''), 0);
}

@Component({
  selector: 'app-root',
  template: `
    <label>Search: {{actions.search$ | async}}</label>
    <input (input)="actions.search($event)">
    <label>Count: {{actions.count$ | async}}</label>
    <input type="number" (input)="actions.count($event)">
  `,
  providers: [RxActionsFactory]
})
export class AppComponent {

  actions = this.actionFactory.create({
    search: coerceString,
    count: coerceNumber
  });

  constructor(private actionFactory: RxActionsFactory<UIActions>) {
    this.actions.search('');
    this.actions.count('4');
  }

}
