import http from "http";
import https from "https";
import xs, { Listener, Stream } from "xstream";
import { createRequestWrapper } from "./request";
import { adapt } from "@cycle/run/lib/adapt";
import run, { Driver } from "@cycle/run";
import flattenConcurrently from "xstream/extra/flattenConcurrently";
import { Server } from "net";
import { ResponseAction, SendActionOption } from "./response";

function applyMiddlewares(
  middlewares: MiddleWareListener[],
  req: NodeJS.ReadableStream & any,
  res: NodeJS.WritableStream & any
) {
  return new Promise((resolve, reject) => {
    const size = middlewares ? middlewares.length : 0;
    let i = -1;

    function next(err?: any) {
      if (err) {
        return reject(err);
      }

      i++;
      if (i < size) {
        middlewares[i](req, res, next);
      } else {
        resolve();
      }
    }

    next();
  });
}

function createServerProducer(
  instanceId: any,
  listenOptions: ListenOption,
  middlewares: MiddleWareListener[],
  render: Render,
  createServer: (listener: http.RequestListener) => Server
) {
  let server: Server;

  const listenArgs =
    typeof listenOptions.handle === "object"
      ? [listenOptions.handle!]
      : typeof listenOptions.path === "string"
      ? [listenOptions.path!]
      : [
          listenOptions.port!,
          listenOptions.hostname!,
          listenOptions.backlog!,
        ].filter((x) => !!x);

  return {
    start(listener: Listener<any>) {
      server = createServer((req, res) =>
        applyMiddlewares(middlewares, req, res)
          .then(() => {
            listener.next(createRequestWrapper(instanceId, req, res, render));
          })
          .catch((err) => {
            listener.error(err);
          })
      );
      server.listen(listenOptions, () => {
        listener.next({
          event: "ready",
          instanceId,
          instance: server,
        });
      });
    },

    stop() {
      server.close();
    },
  };
}

function makeCreateAction(
  rootMiddlewares: MiddleWareListener[],
  render: Render,
  stopAction$: Stream<any>
) {
  return function createAction({
    id,
    secured,
    securedOptions,
    port,
    hostname,
    backlog,
    handle,
    path,
    middlewares = [],
  }: {
    id: any;
    secured?: boolean;
    securedOptions?: any;
    port?: number;
    hostname?: string;
    backlog?: number;
    handle?: any;
    path?: string;
    middlewares?: any[] | undefined;
  }) {
    const createServerFunc = secured
      ? (callback: http.RequestListener) =>
          https.createServer(securedOptions, callback)
      : (callback: http.RequestListener) => http.createServer(callback);
    return xs
      .create(
        createServerProducer(
          id,
          { port, hostname, backlog, handle, path },
          [...rootMiddlewares, ...middlewares],
          render,
          createServerFunc
        )
      )
      .endWhen(stopAction$.filter((o) => o.id === id));
  };
}

function sendAction({
  res,
  content,
  headers = {},
  statusCode = 200,
  statusMessage = undefined,
}: {
  res: http.ServerResponse;
  content: string | null;
  headers: http.OutgoingHttpHeaders;
  statusCode: number;
  statusMessage?: string;
}) {
  res.writeHead(statusCode, statusMessage || "", headers);
  res.end(content);
}

export function makeHttpServerDriver({
  middlewares = [],
  render = (data: any) => data,
}: {
  middlewares?: MiddleWareListener[];
  render?: Render;
}) {
  return function httpServerDriver(input$: Stream<any>) {
    const closeAction$ = input$.filter((o) => o.action === "close");
    const createAction$ = input$
      .filter((o) => o.action === "create")
      .map(makeCreateAction(middlewares, render, closeAction$))
      .compose(flattenConcurrently);
    const sendAction$ = input$
      .filter((o) => o.action === "send")
      .map(sendAction);

    sendAction$.addListener({
      next() {},
      complete() {},
      error() {},
    });

    return {
      select(instanceId: any) {
        return {
          events(name: string) {
            return adapt(
              createAction$.filter(
                (o) => o.instanceId === instanceId && o.event === name
              )
            );
          },
        };
      },
    } as HttpServerDriverSource;
  };
}

export type Action = {
  event: string;
  instanceId: any;
  original: NodeJS.ReadWriteStream & any;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: http.OutgoingHttpHeaders;
  body?: {};
  response: ResponseAction;
};

export type MiddleWareListener = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: (err: any) => void
) => void;

export type ListenOption = {
  handle?: {};
  path?: string;
  port?: number;
  hostname?: string;
  backlog?: number;
};

// export type NodeServerListener = (req: NodeJS.ReadableStream, res: NodeJS.WritableStream) => void;
export type Render = (data: any) => any;

export type HttpServerDriverSource = {
  select: (instanceId: any) => { events: (name: string) => xs<any> };
};
