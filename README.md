# Lazada PH

React + Vite storefront with an Express API.

## Development

```bash
npm install
npm run dev:full
```

The API uses Firebase Firestore when Firebase credentials are configured. Add these values to `.env` from a Firebase service account:

```text
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_COLLECTION_PREFIX=lazada_ph
```

Firestore collections are stored with the prefix, for example `lazada_ph_users`, `lazada_ph_sellers`, `lazada_ph_products`, and `lazada_ph_orders`.

If Firebase is not configured, the API falls back to a local NoSQL JSON store:

```text
server/data/lazada-nosql.json
```

You can override the fallback location with `NOSQL_DB_PATH` in `.env`.

## Scripts

- `npm run dev` - start the Vite frontend.
- `npm run server` - start the Express API.
- `npm run dev:full` - start frontend and API together.
- `npm run build` - build the frontend.
- `npm run lint` - run ESLint.
- `npm run test:workflow` - run the API workflow smoke test.
