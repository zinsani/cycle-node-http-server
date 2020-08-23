import switchPath from "switch-path";
import xs, { Stream } from "xstream";
import flattenConcurrently from "xstream/extra/flattenConcurrently";

export function Router(sources: { [key: string]: Stream<any> }, routes: any) {
  const { request$ } = sources;

  return request$.map((req: any) => {
    const { path, value } = switchPath(req.url, routes);
    return value({ ...sources, request$: xs.of(req) });
  });
}
