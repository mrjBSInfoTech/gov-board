import { ZipArchive } from "archiver";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

export const BACKUP_ROOTS = ["uploads", "private-uploads"];
const MAX_ARCHIVE_ENTRIES = 100000;
const MAX_ARCHIVE_ENTRY_SIZE = 2 * 1024 * 1024 * 1024;
const MAX_ARCHIVE_EXPANDED_SIZE = 8 * 1024 * 1024 * 1024;
const BACKUP_BUFFER_KEY = "__govBoardBackupBuffer";

export class InvalidBackupError extends Error {}

const quoteIdentifier = (identifier) => {
  if (!/^[A-Za-z0-9_$]+$/.test(identifier)) {
    throw new Error("Unsupported database identifier.");
  }
  return `\`${identifier}\``;
};

const getDatabaseTables = async (connection) => {
  const [rows] = await connection.query(
    "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
  );
  return rows
    .map((row) => Object.values(row)[0])
    .sort((left, right) => left.localeCompare(right));
};

const getTableColumns = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SHOW COLUMNS FROM ${quoteIdentifier(tableName)}`,
  );
  return rows.map((row) => ({ name: row.Field, type: row.Type }));
};

const encodeDatabaseValue = (value) => {
  if (Buffer.isBuffer(value)) {
    return { [BACKUP_BUFFER_KEY]: value.toString("base64") };
  }
  if (typeof value === "bigint") return value.toString();
  return value;
};

const writeTableSnapshot = async (connection, table, outputPath) => {
  const query = `SELECT * FROM ${quoteIdentifier(table.name)}`;
  const rowStream = connection.connection
    .query(query)
    .stream({ highWaterMark: 25 });

  const lines = async function* () {
    yield `${JSON.stringify({ type: "table", ...table })}\n`;
    for await (const row of rowStream) {
      yield `${JSON.stringify({
        type: "row",
        values: table.columns.map((column) =>
          encodeDatabaseValue(row[column.name]),
        ),
      })}\n`;
    }
  };

  await pipeline(Readable.from(lines()), fs.createWriteStream(outputPath));
};

const appendUploadFiles = async (archive, backendDirectory, root) => {
  const rootPath = path.join(backendDirectory, root);
  await fs.promises.mkdir(rootPath, { recursive: true });

  const walk = async (directoryPath, relativePath = "") => {
    const entries = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const childRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;
      const childPath = path.join(directoryPath, entry.name);
      const archivePath = `${root}/${childRelativePath.split(path.sep).join("/")}`;

      if (entry.isDirectory()) {
        await walk(childPath, childRelativePath);
      } else if (entry.isFile()) {
        archive.file(childPath, { name: archivePath });
      } else {
        throw new Error(`Unsupported file in ${root}: ${entry.name}`);
      }
    }
  };

  await walk(rootPath);
};

export async function createSystemBackup(
  connection,
  backendDirectory,
  workingDirectory,
  archivePath,
) {
  const databaseDirectory = path.join(workingDirectory, "database");
  await fs.promises.mkdir(databaseDirectory, { recursive: true });

  const tableNames = await getDatabaseTables(connection);
  if (tableNames.length === 0) {
    throw new Error("The database contains no tables to back up.");
  }

  const tables = [];
  await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");

  try {
    for (const name of tableNames) {
      const table = { name, columns: await getTableColumns(connection, name) };
      if (!table.columns.length) {
        throw new Error(`Database table ${name} has no columns.`);
      }
      tables.push(table);
      await writeTableSnapshot(
        connection,
        table,
        path.join(databaseDirectory, `${name}.ndjson`),
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  const manifest = {
    format: "gov-board-system-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    roots: BACKUP_ROOTS,
    tables,
  };
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const archiveOutput = fs.createWriteStream(archivePath);
  const archivePipeline = pipeline(archive, archiveOutput);
  archivePipeline.catch(() => {});

  try {
    archive.append(JSON.stringify(manifest), { name: "manifest.json" });
    for (const table of tables) {
      archive.file(path.join(databaseDirectory, `${table.name}.ndjson`), {
        name: `database/${table.name}.ndjson`,
      });
    }
    for (const root of BACKUP_ROOTS) {
      await appendUploadFiles(archive, backendDirectory, root);
    }
    await archive.finalize();
    await archivePipeline;
  } catch (error) {
    archive.destroy(error);
    await archivePipeline.catch(() => {});
    throw error;
  }

  return manifest;
}

export function getBackupEntryPath(fileName, isDirectory = false) {
  if (
    typeof fileName !== "string" ||
    !fileName ||
    fileName.includes("\\") ||
    fileName.includes("\0") ||
    fileName.startsWith("/") ||
    /^[a-zA-Z]:/.test(fileName)
  ) {
    throw new InvalidBackupError("The backup contains an unsafe file path.");
  }

  const normalizedName = isDirectory
    ? fileName.replace(/\/+$/, "")
    : fileName;
  const parts = normalizedName.split("/");
  if (
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        /[<>:"|?*\u0000-\u001f]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
    )
  ) {
    throw new InvalidBackupError("The backup contains an unsafe file path.");
  }

  const [root, ...remainingParts] = parts;
  if (root === "manifest.json" && remainingParts.length === 0 && !isDirectory) {
    return normalizedName;
  }
  if (root === "database") {
    if (isDirectory && remainingParts.length === 0) return normalizedName;
    if (
      !isDirectory &&
      remainingParts.length === 1 &&
      /^[A-Za-z0-9_$]+\.ndjson$/.test(remainingParts[0])
    ) {
      return normalizedName;
    }
  }
  if (
    BACKUP_ROOTS.includes(root) &&
    (remainingParts.length > 0 || isDirectory)
  ) {
    return normalizedName;
  }

  throw new InvalidBackupError("The backup contains an unsupported file path.");
}

const openZipFile = (filePath) =>
  new Promise((resolve, reject) => {
    yauzl.open(
      filePath,
      {
        lazyEntries: true,
        autoClose: false,
        validateEntrySizes: true,
        strictFileNames: true,
        decodeStrings: true,
      },
      (error, zipFile) => {
        if (error) {
          reject(new InvalidBackupError("The uploaded file is not a valid ZIP backup."));
          return;
        }
        resolve(zipFile);
      },
    );
  });

const getZipEntryStream = (zipFile, entry) =>
  new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(new InvalidBackupError("The backup file is corrupted."));
      else resolve(stream);
    });
  });

const resolveExtractedPath = (root, entryPath) => {
  const target = path.resolve(root, ...entryPath.split("/"));
  const relative = path.relative(root, target);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new InvalidBackupError("The backup contains an unsafe file path.");
  }
  return target;
};

export async function extractSystemBackup(archivePath, extractDirectory) {
  await fs.promises.mkdir(extractDirectory, { recursive: true });
  const zipFile = await openZipFile(archivePath);
  const extractedFiles = new Set();
  const extractedPaths = new Set();
  let entryCount = 0;
  let expandedBytes = 0;

  try {
    await new Promise((resolve, reject) => {
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      zipFile.on("error", (error) => {
        fail(new InvalidBackupError(`Unable to read the backup archive: ${error.message}`));
      });
      zipFile.on("end", () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      zipFile.on("entry", (entry) => {
        const handleEntry = async () => {
          entryCount += 1;
          if (entryCount > MAX_ARCHIVE_ENTRIES) {
            throw new InvalidBackupError("The backup contains too many files.");
          }

          const isDirectory = entry.fileName.endsWith("/");
          const entryPath = getBackupEntryPath(entry.fileName, isDirectory);
          if (extractedPaths.has(entryPath)) {
            throw new InvalidBackupError("The backup contains duplicate file paths.");
          }
          extractedPaths.add(entryPath);

          const mode = (entry.externalFileAttributes >>> 16) & 0xffff;
          const entryType = mode & 0o170000;
          if (
            entryType === 0o120000 ||
            (isDirectory && entryType !== 0 && entryType !== 0o040000) ||
            (!isDirectory && entryType !== 0 && entryType !== 0o100000)
          ) {
            throw new InvalidBackupError("The backup contains an unsupported file type.");
          }

          const targetPath = resolveExtractedPath(extractDirectory, entryPath);
          if (isDirectory) {
            await fs.promises.mkdir(targetPath, { recursive: true });
          } else {
            if (
              entry.uncompressedSize > MAX_ARCHIVE_ENTRY_SIZE ||
              expandedBytes + entry.uncompressedSize > MAX_ARCHIVE_EXPANDED_SIZE
            ) {
              throw new InvalidBackupError("The backup is larger than the supported restore limit.");
            }

            await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
            const input = await getZipEntryStream(zipFile, entry);
            let entryBytes = 0;
            const meter = new Transform({
              transform(chunk, _encoding, callback) {
                entryBytes += chunk.length;
                expandedBytes += chunk.length;
                if (
                  entryBytes > MAX_ARCHIVE_ENTRY_SIZE ||
                  expandedBytes > MAX_ARCHIVE_EXPANDED_SIZE
                ) {
                  callback(new InvalidBackupError("The backup is larger than the supported restore limit."));
                  return;
                }
                callback(null, chunk);
              },
            });
            await pipeline(
              input,
              meter,
              fs.createWriteStream(targetPath, { flags: "wx" }),
            );
            extractedFiles.add(entryPath);
          }

          zipFile.readEntry();
        };

        void handleEntry().catch(fail);
      });
      zipFile.readEntry();
    });
  } finally {
    zipFile.close();
  }

  return { extractedFiles, extractedPaths };
}

const validateManifest = (manifest) => {
  if (
    !manifest ||
    manifest.format !== "gov-board-system-backup" ||
    manifest.version !== 1 ||
    typeof manifest.createdAt !== "string" ||
    !Array.isArray(manifest.roots) ||
    BACKUP_ROOTS.some((root, index) => manifest.roots[index] !== root) ||
    manifest.roots.length !== BACKUP_ROOTS.length ||
    !Array.isArray(manifest.tables) ||
    manifest.tables.length === 0
  ) {
    throw new InvalidBackupError("The file is not a supported GovBoard backup.");
  }

  const names = new Set();
  for (const table of manifest.tables) {
    if (
      !table ||
      typeof table.name !== "string" ||
      !/^[A-Za-z0-9_$]+$/.test(table.name) ||
      names.has(table.name) ||
      !Array.isArray(table.columns) ||
      table.columns.length === 0
    ) {
      throw new InvalidBackupError("The backup database manifest is invalid.");
    }
    names.add(table.name);

    const columnNames = new Set();
    for (const column of table.columns) {
      if (
        !column ||
        typeof column.name !== "string" ||
        !column.name ||
        typeof column.type !== "string" ||
        !column.type ||
        columnNames.has(column.name)
      ) {
        throw new InvalidBackupError("The backup database manifest is invalid.");
      }
      columnNames.add(column.name);
    }
  }

  if (!names.has("admin")) {
    throw new InvalidBackupError("The backup does not contain administrator accounts.");
  }
};

const readManifest = async (extractDirectory) => {
  const manifestPath = path.join(extractDirectory, "manifest.json");
  try {
    const stat = await fs.promises.stat(manifestPath);
    if (!stat.isFile() || stat.size > 10 * 1024 * 1024) {
      throw new InvalidBackupError("The backup manifest is invalid.");
    }
    const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
    validateManifest(manifest);
    return manifest;
  } catch (error) {
    if (error instanceof InvalidBackupError) throw error;
    throw new InvalidBackupError("The backup manifest is missing or invalid.");
  }
};

const isBinaryColumn = (column) => /(binary|blob|bit|geometry)/i.test(column.type);

const validateEncodedValue = (value, column) => {
  if (!isBinaryColumn(column) || value === null) return;
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    typeof value[BACKUP_BUFFER_KEY] !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value[BACKUP_BUFFER_KEY],
    )
  ) {
    throw new InvalidBackupError("A binary database value in the backup is invalid.");
  }
};

const readTableRecords = async function* (filePath, table) {
  const input = fs.createReadStream(filePath);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let isHeader = true;

  try {
    for await (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        throw new InvalidBackupError(`The backup data for ${table.name} is invalid.`);
      }

      if (isHeader) {
        if (
          !record ||
          typeof record !== "object" ||
          Array.isArray(record) ||
          record.type !== "table" ||
          record.name !== table.name ||
          !Array.isArray(record.columns) ||
          record.columns.length !== table.columns.length ||
          record.columns.some(
            (column, index) =>
              !column ||
              column.name !== table.columns[index].name ||
              typeof column.type !== "string" ||
              column.type.toLowerCase() !== table.columns[index].type.toLowerCase(),
          )
        ) {
          throw new InvalidBackupError(`The backup schema for ${table.name} is invalid.`);
        }
        isHeader = false;
        continue;
      }

      if (
        !record ||
        typeof record !== "object" ||
        Array.isArray(record) ||
        record.type !== "row" ||
        !Array.isArray(record.values) ||
        record.values.length !== table.columns.length
      ) {
        throw new InvalidBackupError(`The backup data for ${table.name} is invalid.`);
      }
      record.values.forEach((value, index) =>
        validateEncodedValue(value, table.columns[index]),
      );

      yield record.values;
    }
  } finally {
    lines.close();
    input.destroy();
  }

  if (isHeader) {
    throw new InvalidBackupError(`The backup data for ${table.name} is empty.`);
  }
};

export async function validateSystemBackup(
  extractDirectory,
  connection,
  extractedFiles,
) {
  if (!extractedFiles.has("manifest.json")) {
    throw new InvalidBackupError("The backup manifest is missing.");
  }
  const manifest = await readManifest(extractDirectory);
  const liveTableNames = await getDatabaseTables(connection);
  const backupTableNames = manifest.tables
    .map((table) => table.name)
    .sort((left, right) => left.localeCompare(right));

  if (
    liveTableNames.length !== backupTableNames.length ||
    liveTableNames.some((name, index) => name !== backupTableNames[index])
  ) {
    throw new InvalidBackupError(
      "The backup database tables do not match this GovBoard installation.",
    );
  }

  let primaryAdminFound = false;
  for (const table of manifest.tables) {
    const liveColumns = await getTableColumns(connection, table.name);
    if (
      liveColumns.length !== table.columns.length ||
      liveColumns.some(
        (column, index) =>
          column.name !== table.columns[index].name ||
          column.type.toLowerCase() !== table.columns[index].type.toLowerCase(),
      )
    ) {
      throw new InvalidBackupError(
        `The backup schema for ${table.name} does not match this installation.`,
      );
    }

    const tableFile = `database/${table.name}.ndjson`;
    if (!extractedFiles.has(tableFile)) {
      throw new InvalidBackupError(`The backup data for ${table.name} is missing.`);
    }
    const tablePath = path.join(extractDirectory, "database", `${table.name}.ndjson`);
    const tableStat = await fs.promises.stat(tablePath);
    if (!tableStat.isFile()) {
      throw new InvalidBackupError(`The backup data for ${table.name} is invalid.`);
    }

    if (table.name === "admin") {
      const idIndex = table.columns.findIndex((column) => column.name === "admin_id");
      const positionIndex = table.columns.findIndex((column) => column.name === "position");
      if (idIndex < 0 || positionIndex < 0) {
        throw new InvalidBackupError("The primary administrator data is invalid.");
      }
      for await (const values of readTableRecords(tablePath, table)) {
        if (
          Number(values[idIndex]) === 1 &&
          values[positionIndex] === "Super Admin"
        ) {
          primaryAdminFound = true;
        }
      }
    } else {
      for await (const _values of readTableRecords(tablePath, table)) {
        // Validate every row before modifying the database.
      }
    }
  }

  if (!primaryAdminFound) {
    throw new InvalidBackupError(
      "The backup must include the primary Super Admin account.",
    );
  }

  const expectedDatabaseFiles = new Set(
    manifest.tables.map((table) => `database/${table.name}.ndjson`),
  );
  const actualDatabaseFiles = [...extractedFiles].filter((file) =>
    file.startsWith("database/"),
  );
  if (
    actualDatabaseFiles.length !== expectedDatabaseFiles.size ||
    actualDatabaseFiles.some((file) => !expectedDatabaseFiles.has(file))
  ) {
    throw new InvalidBackupError("The backup contains unexpected database files.");
  }

  return manifest;
}

const getDatabaseValue = (value, column) => {
  if (value === null) return null;
  if (isBinaryColumn(column)) {
    return Buffer.from(value[BACKUP_BUFFER_KEY], "base64");
  }
  if (/^json\b/i.test(column.type)) return JSON.stringify(value);
  return value;
};

const insertTableData = async (connection, extractDirectory, table) => {
  const tablePath = path.join(extractDirectory, "database", `${table.name}.ndjson`);
  const records = readTableRecords(tablePath, table);
  const quoteColumns = table.columns
    .map((column) => `\`${column.name.replace(/`/g, "``")}\``)
    .join(", ");
  const quotedTable = quoteIdentifier(table.name);
  let rows = [];

  const insertRows = async () => {
    if (!rows.length) return;
    const rowPlaceholders = `(${table.columns.map(() => "?").join(", ")})`;
    const placeholders = rows.map(() => rowPlaceholders).join(", ");
    const values = rows.flat();
    await connection.query(
      `INSERT INTO ${quotedTable} (${quoteColumns}) VALUES ${placeholders}`,
      values,
    );
    rows = [];
  };

  for await (const values of records) {
    rows.push(
      values.map((value, index) =>
        getDatabaseValue(value, table.columns[index]),
      ),
    );
    if (rows.length >= 100) await insertRows();
  }
  await insertRows();
};

const replaceBackupDirectories = async (
  backendDirectory,
  extractDirectory,
  workingDirectory,
) => {
  const previousDirectory = path.join(workingDirectory, "previous");
  await fs.promises.mkdir(previousDirectory, { recursive: true });
  const replaced = [];

  const rollback = async () => {
    const errors = [];
    for (const item of [...replaced].reverse()) {
      if (item.installed) {
        try {
          await fs.promises.rm(item.target, { recursive: true, force: true });
        } catch (error) {
          errors.push(error);
        }
      }
      if (item.hadOriginal) {
        try {
          await fs.promises.rename(item.previous, item.target);
        } catch (error) {
          errors.push(error);
        }
      }
    }
    if (errors.length) {
      const error = new Error("Unable to fully restore the previous upload folders.");
      error.rollbackFailed = true;
      error.cause = errors[0];
      throw error;
    }
  };

  try {
    for (const root of BACKUP_ROOTS) {
      const target = path.join(backendDirectory, root);
      const staged = path.join(extractDirectory, root);
      const previous = path.join(previousDirectory, root);
      await fs.promises.mkdir(staged, { recursive: true });

      let hadOriginal = false;
      try {
        await fs.promises.rename(target, previous);
        hadOriginal = true;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      const item = { target, previous, hadOriginal, installed: false };
      replaced.push(item);
      await fs.promises.rename(staged, target);
      item.installed = true;
    }
  } catch (error) {
    try {
      await rollback();
    } catch (rollbackError) {
      rollbackError.cause = error;
      throw rollbackError;
    }
    throw error;
  }

  return rollback;
};

export async function restoreSystemBackup(
  connection,
  manifest,
  extractDirectory,
  backendDirectory,
  workingDirectory,
) {
  let transactionStarted = false;
  let rollbackFiles;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of [...manifest.tables].reverse()) {
      await connection.query(`DELETE FROM ${quoteIdentifier(table.name)}`);
    }
    for (const table of manifest.tables) {
      await insertTableData(connection, extractDirectory, table);
    }

    rollbackFiles = await replaceBackupDirectories(
      backendDirectory,
      extractDirectory,
      workingDirectory,
    );
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();
    transactionStarted = false;
  } catch (error) {
    let rollbackFailed = Boolean(error.rollbackFailed);
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error("Unable to roll back system backup database changes:", rollbackError.code || rollbackError.name);
      }
      transactionStarted = false;
    }
    if (rollbackFiles) {
      try {
        await rollbackFiles();
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error("Unable to roll back system backup upload folders:", rollbackError.code || rollbackError.name);
      }
    }
    if (rollbackFailed) {
      const rollbackError = new Error("The system restore could not be fully rolled back.");
      rollbackError.rollbackFailed = true;
      rollbackError.cause = error;
      throw rollbackError;
    }
    throw error;
  } finally {
    try {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (error) {
      console.error("Unable to re-enable database foreign key checks:", error);
    }
  }
}
