import { readJsonFile, writeJsonFile, withFileLock } from "./json-file.js";

// ── Types ──────────────────────────────────────────────────────────────

export type AdminCredentialRecord = {
  id: string;
  passwordHash: string;
  passwordAlgorithm: string;
  passwordParams: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
};

export type AdminCredentialRepository = {
  /** Returns the singleton admin credential, or undefined if not configured yet. */
  get(): Promise<AdminCredentialRecord | undefined>;
  /** Create or update the singleton admin credential. passwordChangedAt defaults to now if omitted. */
  upsert(
    input: Omit<
      AdminCredentialRecord,
      "id" | "createdAt" | "updatedAt" | "passwordChangedAt"
    >,
  ): Promise<AdminCredentialRecord>;
};

// ── JSON implementation ────────────────────────────────────────────────

type CredentialFile = { credential?: AdminCredentialRecord };

function emptyCredentialFile(): CredentialFile {
  return {};
}

export function createJsonAdminCredentialRepository(
  filePath = "data/admin-credential.json",
): AdminCredentialRepository {
  return {
    async get() {
      const data = await readJsonFile<CredentialFile>(
        filePath,
        emptyCredentialFile(),
      );
      return data.credential;
    },

    async upsert(input) {
      return withFileLock(filePath, async () => {
        const data = await readJsonFile<CredentialFile>(
          filePath,
          emptyCredentialFile(),
        );
        const now = new Date().toISOString();
        const existing = data.credential;
        const credential: AdminCredentialRecord = {
          id: "admin",
          ...input,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          passwordChangedAt: now,
        };
        data.credential = credential;
        await writeJsonFile(filePath, data);
        return credential;
      });
    },
  };
}
