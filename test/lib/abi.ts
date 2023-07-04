import { ethers } from "ethers";

const iface = new ethers.utils.Interface(["function Error(string)"]);

export function encodeError(reason: string) {
  return iface.encodeFunctionData("Error(string)", [reason]);
}
