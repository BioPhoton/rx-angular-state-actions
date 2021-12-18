import {Observable, Subject} from "rxjs";
import {Injectable, OnDestroy} from "@angular/core";

export type ValuesOf<O> = O[keyof O];
// type Keys = KeysOf<{ a: string, b: number }>; // "a" | "b"
export type KeysOf<O> = keyof O;

// class vs instance
export type InstanceOrType<T> = T extends abstract new (...args: any) => infer R ? R : T;

// We infer all arguments instead of just the first one as we are more flexible for later changes
export type InferArguments<T> = T extends (...args: infer R) => any ? R : never;

// It helps to infer the type of an objects key
// We have to use it because using just U[K] directly would @TODO
export type Select<U, K> = K extends keyof U ? U[K] : never;

export type ExtractString<T extends object> = Extract<keyof T, string>

// Helper to get either the params of the transform function, or if the function is not present a fallback type
type FunctionParamsOrValueType<U, K, F> = InferArguments<
  Select<U, K>
  > extends never
  ? [F]
  : InferArguments<Select<U, K>>;

export type SubjectMap<T> = { [K in keyof T]: Subject<T[K]> }

export type Actions = {};

export type ActionTransforms<T extends {}> = Partial<{
  [K in keyof T]: (...args: any[]) => T[K];
}>;

export type ActionDispatchFn<O extends unknown[]> = (
  ...value: InstanceOrType<O>
) => void;

export type ActionDispatchers<T extends Actions, U extends {}> = {
  [K in keyof T]: ActionDispatchFn<
    FunctionParamsOrValueType<U, K, Select<T, K>>
    >;
};

export type ActionObservables<T extends Actions> = {
  [K in ExtractString<T> as `${K}$`]: Observable<InstanceOrType<T[K]>>;
};

export type RxActions<T extends Actions, U extends {} = T> = ActionDispatchers<T, U> & ActionObservables<T>;

@Injectable()
export class RxActionsFactory<T extends Actions> implements OnDestroy {
  private subjects: SubjectMap<T> = {} as SubjectMap<T>;

  /*
   * Returns a object based off of the provided typing with a separate setter `[prop](value: T[K]): void` and observable stream `[prop]$: Observable<T[K]>`;
   *
   * { search: string } => { search$: Observable<string>, search: (value: string) => void;}
   *
   * @example
   *
   * interface UIActions {
   *  search: string,
   *  submit: void
   * };
   *
   * const actions = create<UIActions>();
   *
   * actions.search($event.target.value);
   * actions.search$ | async;
   *
   * As it is well typed the following things would not work:
   * actions.submit('not void'); // not void
   * actions.search(); // requires an argument
   * actions.search(42); // not a string
   * actions.search$.error(new Error('traraaa')); // not possible by typings as well as in code
   * actions.search = "string"; // not a setter. the proxy will throw an error pointing out that you have to call it
   *
   * @param transforms - A map of transform functions to apply on transformations to actions before emitting them.
   * This is very useful to clean up bloated templates and components. e.g. `[input]="$event?.target?.value"` => `[input]="$event"`
   *
   * @example
   * function coerceSearchActionParams(e: Event | string | number): string {
   *   if(e?.target?.value !== undefined) {
   *      return e?.target?.value + ''
   *   }
   *   return e + '';
   * }
   * const actions = getActions<search: string, submit: void>({search: coerceSearchActionParams, submit: (v: any) => void 0;});
   *
   * actions.search($event);
   * actions.search('string');
   * actions.search(42);
   * actions.submit('not void'); // does not error anymore
   * actions.search$ | async; // string Observable
   *
   */
  create<U extends ActionTransforms<T> = {}>(transforms?: U): RxActions<T, U> {
    return new Proxy(
      {} as RxActions<T, U>,
      actionProxyHandler(this.subjects, transforms)
    ) as RxActions<T, U>;
  }

  destroy() {
    for (let subjectsKey in this.subjects) {
      this.subjects[subjectsKey].complete();
    }
  }

  /**
   * internally used to clean up potential subscriptions to the subjects. (For Actions it is most probably a rare case but still important to care about)
   */
  ngOnDestroy() {
    this.destroy();
  }
}


/**
 * Internal helper to create the proxy object
 * It lifes as standalone function because we dont need to carrie it in memory for every ActionHandler instance
 * @param subjects
 * @param transforms
 */

export function actionProxyHandler<T, U>(
  subjects: { [K in keyof T]: Subject<T[K]> },
  transforms?: U
): ProxyHandler<RxActions<T, U>> {
  return {
    get(_, property: string) {
      type KeysOfT = KeysOf<T>;
      type ValuesOfT = ValuesOf<T>;

      const prop = property as KeysOfT;

      // the user wants to get a observable
      if (prop.toString().split('').pop() === '$') {
        const propName = prop.toString().slice(0, -1) as KeysOfT;
        subjects[propName] = subjects[propName] || new Subject<ValuesOfT>();
        return subjects[propName];
      }

      // the user wants to get a dispatcher function
      return (args: ValuesOfT) => {
        subjects[prop] = subjects[prop] || new Subject<ValuesOfT>();
        const val = transforms && (transforms as any)[prop] ? (transforms as any)[prop](args) : args
        subjects[prop].next(val);
      };
    },
    set() {
      throw new Error('No setters available. To emit call the property name.');
    },
  };
}
