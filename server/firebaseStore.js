import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const collectionNames = [
  'users',
  'sellers',
  'products',
  'orders',
  'reviews',
  'categories',
  'adminLogs',
  'removedProducts',
  'drivers',
];

const idFields = {
  users: ['id'],
  sellers: ['id', 'sellerId'],
  products: ['id'],
  orders: ['id'],
  reviews: ['reviewId', 'id'],
  categories: ['id', 'slug'],
  adminLogs: ['id'],
  removedProducts: ['id'],
  drivers: ['id'],
};

const collectionPrefix = process.env.FIREBASE_COLLECTION_PREFIX || 'lazada_ph';
let firestore = null;
let writeQueue = Promise.resolve();

const hasServiceAccountEnv = Boolean(
  process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL
    && process.env.FIREBASE_PRIVATE_KEY,
);

const hasApplicationDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_PROJECT_ID);

export const isFirebaseConfigured = process.env.FIREBASE_DISABLED !== 'true'
  && (hasServiceAccountEnv || hasApplicationDefault || hasEmulator);

export const firebaseStoreName = `Firebase Firestore (${collectionPrefix}_*)`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const cleanForFirestore = (value) => {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cleanForFirestore(entry)]),
  );
};

const normalizePrivateKey = (key = '') => key.replace(/\\n/g, '\n');

const stripStoreIndex = (data) => {
  const clean = { ...data };
  delete clean.__storeIndex;
  return clean;
};

const getFirebaseApp = () => {
  const existing = getApps()[0];
  if (existing) return existing;

  if (hasEmulator) {
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  }

  if (hasServiceAccountEnv) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
};

const getDb = () => {
  if (firestore) return firestore;
  firestore = getFirestore(getFirebaseApp());
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
};

const collectionPath = (name) => `${collectionPrefix}_${name}`;

const docIdFor = (collectionName, item, index) => {
  const field = idFields[collectionName].find((key) => item[key] !== undefined && item[key] !== null);
  const raw = field ? item[field] : `${collectionName}_${index}`;
  return encodeURIComponent(String(raw));
};

const normalizeCollections = (collections, defaults) => {
  const normalized = clone(defaults);
  for (const name of collectionNames) {
    normalized[name] = Array.isArray(collections?.[name]) ? collections[name] : clone(defaults[name]);
  }
  return normalized;
};

const commitOps = async (db, operations) => {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = db.batch();
    operations.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

export const loadFirebaseStore = async (defaults) => {
  if (!isFirebaseConfigured) return null;

  const db = getDb();
  const collections = {};

  await Promise.all(collectionNames.map(async (name) => {
    const snapshot = await db.collection(collectionPath(name)).get();
    collections[name] = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => Number(a.__storeIndex ?? 0) - Number(b.__storeIndex ?? 0))
      .map(stripStoreIndex);
  }));

  const hasData = collectionNames.some((name) => collections[name].length > 0);
  if (!hasData) {
    const initial = normalizeCollections(null, defaults);
    await saveFirebaseStore(initial);
    return initial;
  }

  return normalizeCollections(collections, defaults);
};

export const saveFirebaseStore = async (collections) => {
  const snapshot = normalizeCollections(collections, collections);
  const db = getDb();

  writeQueue = writeQueue.then(async () => {
    for (const name of collectionNames) {
      const ref = db.collection(collectionPath(name));
      const existing = await ref.get();
      const nextIds = new Set(snapshot[name].map((item, index) => docIdFor(name, item, index)));
      const operations = [];

      snapshot[name].forEach((item, index) => {
        const docId = docIdFor(name, item, index);
        operations.push((batch) => batch.set(ref.doc(docId), cleanForFirestore({ ...item, __storeIndex: index })));
      });

      existing.docs
        .filter((doc) => !nextIds.has(doc.id))
        .forEach((doc) => operations.push((batch) => batch.delete(doc.ref)));

      if (operations.length) await commitOps(db, operations);
    }

    await db.collection(collectionPath('metadata')).doc('store').set({
      engine: 'firebase-firestore',
      savedAt: Timestamp.now(),
    });
  });

  return writeQueue;
};
