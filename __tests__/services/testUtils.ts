type FetchPayload = {
  ok?: boolean;
  status?: number;
  json?: unknown;
  text?: string;
  arrayBuffer?: ArrayBuffer;
};

export const mockFetchResponse = ({
  ok = true,
  status = 200,
  json = {},
  text = '',
  arrayBuffer = new ArrayBuffer(0),
}: FetchPayload) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: jest.fn().mockResolvedValue(json),
    text: jest.fn().mockResolvedValue(text),
    arrayBuffer: jest.fn().mockResolvedValue(arrayBuffer),
  });
};

export const mockFetchJson = (json: unknown, status = 200) => {
  mockFetchResponse({ ok: status >= 200 && status < 300, status, json });
};

export const mockFetchText = (text: string, status = 400) => {
  mockFetchResponse({ ok: false, status, text });
};
