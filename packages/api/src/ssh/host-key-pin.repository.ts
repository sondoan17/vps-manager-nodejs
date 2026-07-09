import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nanoid } from "nanoid";
import type { HostKeyPin } from "./host-key-pin.models.js";

export type HostKeyPinRepository = {
  /** Get pin by VPS id (first match if multiple). */
  findByVpsId(vpsId: string): Promise<HostKeyPin | undefined>;
  /** Get pin by host:port. */
  findByHostPort(host: string, port: number): Promise<HostKeyPin | undefined>;
  /** Create or update a pin for a VPS (replaces existing). */
  upsert(pin: Omit<HostKeyPin, "id" | "trustedAt">): Promise<HostKeyPin>;
  /** Delete pin by VPS id. */
  deleteByVpsId(vpsId: string): Promise<boolean>;
};

type PinFile = { pins: HostKeyPin[] };

export function createJsonHostKeyPinRepository(
  filePath = "data/host-key-pins.json",
): HostKeyPinRepository {
  async function readPins(): Promise<HostKeyPin[]> {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as PinFile;
      return parsed.pins ?? [];
    } catch {
      return [];
    }
  }

  async function writePins(pins: HostKeyPin[]): Promise<void> {
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    if (dir) {
      const { mkdir } = await import("node:fs/promises");
      await mkdir(dir, { recursive: true }).catch(() => {});
    }
    await writeFile(filePath, JSON.stringify({ pins }, null, 2), "utf8");
  }

  return {
    async findByVpsId(vpsId: string) {
      const pins = await readPins();
      return pins.find((p) => p.vpsId === vpsId);
    },

    async findByHostPort(host: string, port: number) {
      const pins = await readPins();
      return pins.find((p) => p.host === host && p.port === port);
    },

    async upsert(pin) {
      const pins = await readPins();
      const existingIdx = pins.findIndex((p) => p.vpsId === pin.vpsId);
      const record: HostKeyPin = {
        ...pin,
        id: existingIdx >= 0 ? pins[existingIdx].id : `hsp_${nanoid(12)}`,
        trustedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        pins[existingIdx] = record;
      } else {
        pins.push(record);
      }
      await writePins(pins);
      return record;
    },

    async deleteByVpsId(vpsId: string) {
      const pins = await readPins();
      const idx = pins.findIndex((p) => p.vpsId === vpsId);
      if (idx === -1) return false;
      pins.splice(idx, 1);
      await writePins(pins);
      return true;
    },
  };
}
