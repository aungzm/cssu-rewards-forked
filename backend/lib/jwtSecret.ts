// Centralised JWT secret handling.
//
// index.ts calls dotenv.config() in its module body, but ES modules evaluate
// every import before any body code runs. Reading process.env at module scope
// here would therefore capture the fallback even when a .env file provides a
// secret, while authController reads it at request time. Keeping this as a
// function makes both sides agree on the value that is actually configured.

export const JWT_FALLBACK_SECRET =
  "1d1fa6874e3855ff363b620b5e44ec5774976308423484dfe85dc92c0bf0b078";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || JWT_FALLBACK_SECRET;
}
