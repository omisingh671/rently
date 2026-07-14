import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

type RequestContext = {
  correlationId: string;
  method: string;
  path: string;
};

const storage = new AsyncLocalStorage<RequestContext>();
const validCorrelationId = /^[a-zA-Z0-9._:-]{8,128}$/;

export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const supplied = req.header("x-correlation-id")?.trim();
  const correlationId =
    supplied && validCorrelationId.test(supplied) ? supplied : randomUUID();
  res.setHeader("x-correlation-id", correlationId);
  storage.run(
    { correlationId, method: req.method, path: req.originalUrl },
    next,
  );
};

export const getRequestContext = () => storage.getStore();
export const getCorrelationId = () => storage.getStore()?.correlationId ?? randomUUID();
