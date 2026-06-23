import { Injectable } from "@nestjs/common";
import type { VpsRecord } from "../models/vps.js";
import { provisionPublicKey, verifyPrivateKey } from "./sshService.js";

@Injectable()
export class SshService {
  provisionPublicKey(vps: VpsRecord, password: string, publicKey: string) {
    return provisionPublicKey(vps, password, publicKey);
  }

  verifyPrivateKey(vps: VpsRecord, privateKey: string) {
    return verifyPrivateKey(vps, privateKey);
  }
}
