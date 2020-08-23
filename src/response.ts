import http from "http";
export function createResponseWrapper(
  instanceId: any,
  res: http.ServerResponse,
  render = (data: any) => data
): ResponseAction {
  function _send(
    content: string | null,
    {
      statusCode = 200,
      headers = {},
      statusMessage = undefined,
    }: SendActionOption
  ) {
    return {
      instanceId,
      action: "send",
      res,
      content,
      headers,
      statusCode,
      statusMessage,
    };
  }

  return {
    send: _send,
    json(
      content: string,
      { statusCode = 200, headers = {}, statusMessage = undefined } = {}
    ) {
      return _send(JSON.stringify(content), {
        statusCode,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        statusMessage,
      });
    },
    html(
      content: string,
      { statusCode = 200, headers = {}, statusMessage = undefined } = {}
    ) {
      return _send(content, {
        statusCode,
        headers: {
          "Content-Type": "text/html",
          ...headers,
        },
        statusMessage,
      });
    },
    render(
      content: string,
      {
        beforeContent = "",
        afterContent = "",
        statusCode = 200,
        headers = {},
        statusMessage = undefined,
      } = {}
    ) {
      return _send(beforeContent + render(content) + afterContent, {
        statusCode,
        headers: {
          "Content-Type": "text/html",
          ...headers,
        },
        statusMessage,
      });
    },
    text(
      content: string,
      { statusCode = 200, headers = {}, statusMessage = undefined } = {}
    ) {
      return _send(content, {
        statusCode,
        headers: {
          "Content-Type": "text/plain",
          ...headers,
        },
        statusMessage,
      });
    },
    redirect(
      path: string,
      { statusCode = 302, headers = {}, statusMessage = undefined } = {}
    ) {
      return _send(null, {
        statusCode,
        headers: {
          Location: path,
          ...headers,
        },
        statusMessage,
      });
    },
  };
}

export type ResponseAction = {
  send: SendAction;
  json: (
    content: string,
    option: { statusCode?: number; headers?: any; statusMessage?: string }
  ) => SendResult;
  html: (
    content: string,
    option: { statusCode?: number; headers?: any; statusMessage?: string }
  ) => SendResult;
  render: (
    content: string,
    option: {
      beforeContent?: string;
      afterContent?: string;
      statusCode?: number;
      headers?: any;
      statusMessage?: string;
    }
  ) => SendResult;
  text: (
    content: string,
    option: { statusCode?: number; headers?: any; statusMessage?: string }
  ) => SendResult;
  redirect: (
    path: string,
    option: { statusCode?: number; headers?: any; statusMessage?: string }
  ) => SendResult;
};

export type SendAction = (
  content: string | null,
  options: SendActionOption
) => SendResult;

export type SendActionOption = {
  statusCode: number;
  headers: http.OutgoingHttpHeaders;
  statusMessage?: string;
};

export type SendResult = {
  instanceId: any;
  action: string;
  res: http.ServerResponse;
  content: string | null;
  headers: http.OutgoingHttpHeaders;
  statusCode: number;
  statusMessage?: string;
};
