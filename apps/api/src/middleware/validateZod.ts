import { NextFunction, Request, Response } from "express";
import { ZodSchema, ZodError } from "zod";
import { HttpError } from "../lib/http";

type Schemas = {
  body?: ZodSchema<any>;
  params?: ZodSchema<any>;
  query?: ZodSchema<any>;
};

export function validateZod(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        // include zod issues in details for client consumption
        throw new HttpError(
          "Invalid request",
          400,
          "validation_error",
          err.format()
        );
      }
      // rethrow other errors
      return next(err);
    }
  };
}

export default validateZod;
