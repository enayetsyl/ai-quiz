declare module "cors" {
  import { RequestHandler } from "express";

  export type CorsOptions = any;

  function cors(options?: CorsOptions): RequestHandler;

  export default cors;
}
