import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(__dirname, 'data', 'lazada-nosql.json');

export const nosqlDbPath = resolve(process.env.NOSQL_DB_PATH || defaultDbPath);

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeCollections = (collections, defaults) => {
  const normalized = clone(defaults);
  for (const [key, fallback] of Object.entries(defaults)) {
    normalized[key] = Array.isArray(collections?.[key]) ? collections[key] : clone(fallback);
  }
  return normalized;
};

let writeQueue = Promise.resolve();

export const loadNoSqlStore = async (defaults) => {
  await mkdir(dirname(nosqlDbPath), { recursive: true });

  try {
    const raw = await readFile(nosqlDbPath, 'utf8');
    return normalizeCollections(JSON.parse(raw), defaults);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Unable to load NoSQL database at ${nosqlDbPath}: ${error.message}`, { cause: error });
    }
    const initial = normalizeCollections(null, defaults);
    await saveNoSqlStore(initial);
    return initial;
  }
};

export const saveNoSqlStore = async (collections) => {
  const snapshot = JSON.stringify(
    {
      ...collections,
      metadata: {
        engine: 'file-document-store',
        savedAt: new Date().toISOString(),
      },
    },
    null,
    2,
  );

  writeQueue = writeQueue.then(() => writeFile(nosqlDbPath, `${snapshot}\n`, 'utf8'));
  return writeQueue;
};
