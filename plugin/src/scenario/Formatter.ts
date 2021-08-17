import { ethers } from "ethers";
import * as util from "util";

// Effectively the opposite of parse
export function formatEvent(event: any, outter = true): string {
  return util.format(event);
}

export function formatError(err: any) {
  return JSON.stringify(err); // yeah... for now
}
