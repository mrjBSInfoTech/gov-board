import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import {
  createSystemBackup,
  extractSystemBackup,
  getBackupEntryPath,
  InvalidBackupError,
  restoreSystemBackup,
  validateSystemBackup,
} from "../utils/admin/systemBackup.js";

const createMockConnection = (initialRows) => {
  const tables = {
    admin: [
      { name: "admin_id", type: "int" },
      { name: "position", type: "varchar(50)" },
      { name: "password", type: "varchar(255)" },
    ],
    room: [
      { name: "room_id", type: "int" },
      { name: "room_name", type: "varchar(100)" },
    ],
    attachment: [
      { name: "attachment_id", type: "int" },
      { name: "contents", type: "blob" },
    ],
  };
  const cloneRows = (source) =>
    Object.fromEntries(
      Object.entries(source).map(([name, tableRows]) => [
        name,
        tableRows.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([column, value]) => [
              column,
              Buffer.isBuffer(value) ? Buffer.from(value) : value,
            ]),
          ),
        ),
      ]),
    );
  let rows = cloneRows(initialRows || {
    admin: [
      { admin_id: 1, position: "Super Admin", password: "$2b$test-hash" },
    ],
    room: [
      { room_id: 11, room_name: "Room A" },
      { room_id: 22, room_name: "Room B" },
    ],
    attachment: [{ attachment_id: 1, contents: Buffer.from([8, 9]) }],
  });
  let transactionSnapshot;

  return {
    get rows() {
      return rows;
    },
    connection: {
      query(sql) {
        const tableName = sql.match(/FROM `([^`]+)`/)?.[1];
        return {
          stream: () => Readable.from(rows[tableName]),
        };
      },
    },
    async query(sql, values) {
      if (sql === "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'") {
        return [Object.keys(tables).map((name) => ({ Tables_in_test: name }))];
      }
      const tableName = sql.match(/SHOW COLUMNS FROM `([^`]+)`/)?.[1];
      if (tableName) {
        return [
          tables[tableName].map((column) => ({
            Field: column.name,
            Type: column.type,
          })),
        ];
      }
      const deleteTable = sql.match(/^DELETE FROM `([^`]+)`/);
      if (deleteTable) {
        rows[deleteTable[1]] = [];
        return [[]];
      }
      const insertTable = sql.match(/^INSERT INTO `([^`]+)`/);
      if (insertTable) {
        const name = insertTable[1];
        const width = tables[name].length;
        for (let index = 0; index < values.length; index += width) {
          rows[name].push(
            Object.fromEntries(
              tables[name].map((column, columnIndex) => [
                column.name,
                values[index + columnIndex],
              ]),
            ),
          );
        }
        return [[]];
      }
      return [[]];
    },
    async beginTransaction() {
      transactionSnapshot = cloneRows(rows);
    },
    async commit() {
      transactionSnapshot = null;
    },
    async rollback() {
      if (transactionSnapshot) rows = transactionSnapshot;
    },
  };
};

test("backup paths reject traversal and Windows-special filenames", () => {
  assert.equal(
    getBackupEntryPath("private-uploads/budget/proof.jpg"),
    "private-uploads/budget/proof.jpg",
  );
  for (const unsafePath of [
    "../outside.txt",
    "uploads/../../outside.txt",
    "uploads\\outside.txt",
    "uploads/file.txt:stream",
    "uploads/CON",
    "/absolute/path",
  ]) {
    assert.throws(
      () => getBackupEntryPath(unsafePath),
      InvalidBackupError,
      unsafePath,
    );
  }
});

test("backup exports database rows and both upload roots to a validated ZIP", async () => {
  const workingDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "gov-board-backup-test-"),
  );
  const backendDirectory = path.join(workingDirectory, "backend");
  const uploadFile = path.join(backendDirectory, "uploads", "admin", "avatar.png");
  const privateFile = path.join(
    backendDirectory,
    "private-uploads",
    "budget-contributions",
    "proof.png",
  );
  const archivePath = path.join(workingDirectory, "backup.zip");
  const extractDirectory = path.join(workingDirectory, "extracted");

  try {
    await fs.mkdir(path.dirname(uploadFile), { recursive: true });
    await fs.mkdir(path.dirname(privateFile), { recursive: true });
    await fs.writeFile(uploadFile, Buffer.from([1, 2, 3]));
    await fs.writeFile(privateFile, Buffer.from([4, 5, 6]));

    const connection = createMockConnection();
    const manifest = await createSystemBackup(
      connection,
      backendDirectory,
      workingDirectory,
      archivePath,
    );
    const { extractedFiles } = await extractSystemBackup(
      archivePath,
      extractDirectory,
    );
    const validatedManifest = await validateSystemBackup(
      extractDirectory,
      connection,
      extractedFiles,
    );

    assert.deepEqual(validatedManifest, manifest);
    assert.deepEqual(
      await fs.readFile(
        path.join(extractDirectory, "uploads", "admin", "avatar.png"),
      ),
      Buffer.from([1, 2, 3]),
    );
    assert.deepEqual(
      await fs.readFile(
        path.join(
          extractDirectory,
          "private-uploads",
          "budget-contributions",
          "proof.png",
        ),
      ),
      Buffer.from([4, 5, 6]),
    );

    const roomBackup = await fs.readFile(
      path.join(extractDirectory, "database", "room.ndjson"),
      "utf8",
    );
    const roomRecords = roomBackup
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => JSON.parse(line).values);
    assert.deepEqual(roomRecords, [
      [11, "Room A"],
      [22, "Room B"],
    ]);

    const restoreBackend = path.join(workingDirectory, "restore-backend");
    const oldUpload = path.join(restoreBackend, "uploads", "old.txt");
    const oldPrivateUpload = path.join(
      restoreBackend,
      "private-uploads",
      "old-proof.txt",
    );
    await fs.mkdir(path.dirname(oldUpload), { recursive: true });
    await fs.mkdir(path.dirname(oldPrivateUpload), { recursive: true });
    await fs.writeFile(oldUpload, "old upload");
    await fs.writeFile(oldPrivateUpload, "old private upload");
    const restoreConnection = createMockConnection({
      admin: [],
      room: [{ room_id: 99, room_name: "Outdated room" }],
      attachment: [],
    });

    await restoreSystemBackup(
      restoreConnection,
      validatedManifest,
      extractDirectory,
      restoreBackend,
      workingDirectory,
    );

    assert.deepEqual(restoreConnection.rows, connection.rows);
    assert.deepEqual(restoreConnection.rows.attachment[0].contents, Buffer.from([8, 9]));
    assert.deepEqual(
      await fs.readFile(path.join(restoreBackend, "uploads", "admin", "avatar.png")),
      Buffer.from([1, 2, 3]),
    );
    await assert.rejects(fs.access(oldUpload));
    await assert.rejects(fs.access(oldPrivateUpload));
  } finally {
    await fs.rm(workingDirectory, { recursive: true, force: true });
  }
});
