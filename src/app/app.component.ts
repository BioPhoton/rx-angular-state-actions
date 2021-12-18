import {Component} from '@angular/core';
import {RxActionsFactory} from './actions';
import {coerceNumberProperty} from "@angular/cdk/coercion";
import {exhaustMap} from "rxjs";
import {RxState} from "@rx-angular/state";

interface UIActions {
  auth: { user: string, pass: string };
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

function pluckValue(e: any): string {
  return e.value;
}

@Component({
  selector: 'app-root',
  template: `
    <label>User</label></br>
    <input #user/>
    </br>
    <label>Pass:</label></br>
    <input #pass type="password"/>
    </br>
    <button (click)="actions.auth({user, pass})">Login</button>
  `,
  providers: [RxActionsFactory, RxState]
})
export class AppComponent {
  // fake global state
  authService = {login: (user: string, pass: string) => void 0};

  actions = this.actionFactory.create({
    auth: ({user, pass}: { user: string, pass: string }) => ({user: pluckValue(user), pass: pluckValue(pass)})
  });
  login$ = this.actions.auth$.pipe(
    exhaustMap(({user, pass}) => this.authService.login(user, pass))
  );

  constructor(
    private actionFactory: RxActionsFactory<UIActions>,
    private state: RxState<UIActions>,
  ) {
    this.state.hold(this.login$)
  }

}
