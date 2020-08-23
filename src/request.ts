import http from "http";
import qs from "querystring";
import xs from "xstream";
import { createResponseWrapper } from "./response";
import { Render } from "./driver";

export function createRequestWrapper(
  instanceId: any,
  req: http.IncomingMessage & { body?: any },
  res: http.ServerResponse,
  render: Render
) {
  return {
    event: "request",
    instanceId,
    original: req,
    url: req.url,
    method: req.method,
    headers: req.headers,
    body: req.body,
    response: createResponseWrapper(instanceId, res, render),
  };
}
