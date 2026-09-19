import { lazy, Suspense, type ComponentType } from "react";
export default function dynamic<P extends object>(load: () => Promise<{ default: ComponentType<P> }>) {
  const Component = lazy(load);
  return function FixtureLazy(props: P) { return <Suspense fallback={null}><Component {...props} /></Suspense>; };
}
