import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

export async function createWorkspaceSnapshotArchive(params: {
  fsRoot: string;
  snapshotId: string;
}): Promise<string> {
  const snapshotsDir = path.join(params.fsRoot, ".snapshots");
  await ensureDir(snapshotsDir);

  const archivePath = path.join(snapshotsDir, `${params.snapshotId}.tar.gz`);

  // Create a tar.gz of the workspace root, excluding the snapshot dir itself.
  // tar -czf <archive> -C <root> --exclude=.snapshots .
  await execFileAsync("tar", [
    "-czf",
    archivePath,
    "-C",
    params.fsRoot,
    "--exclude=.snapshots",
    ".",
  ]);

  return archivePath;
}

export async function restoreWorkspaceSnapshotArchive(params: {
  fsRoot: string;
  archivePath: string;
}): Promise<{ backupPath: string }> {
  if (!(await pathExists(params.archivePath))) {
    throw new Error(`Snapshot archive not found: ${params.archivePath}`);
  }

  const parentDir = path.dirname(params.fsRoot);
  const baseName = path.basename(params.fsRoot);
  const backupPath = path.join(parentDir, `${baseName}__backup_${crypto.randomUUID()}`);

  // Move current workspace aside, then re-create the fsRoot and untar.
  if (await pathExists(params.fsRoot)) {
    await fs.rename(params.fsRoot, backupPath);
  }
  await ensureDir(params.fsRoot);

  await execFileAsync("tar", ["-xzf", params.archivePath, "-C", params.fsRoot]);

  // Ensure snapshots dir exists after restore.
  await ensureDir(path.join(params.fsRoot, ".snapshots"));

  return { backupPath };
}

