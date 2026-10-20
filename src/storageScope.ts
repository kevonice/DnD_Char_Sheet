// The beta build (`npm run deploy:beta`, served at /DnD_Char_Sheet/beta/) runs on
// the same origin as the live app, so it would otherwise share localStorage and
// IndexedDB with it — testing "+ New" in the beta would wipe a player's real
// character. Every key gets a prefix in beta mode. Imported first in main.tsx so
// the patch is in place before any module touches storage.

export const IS_BETA = import.meta.env.MODE === 'beta'
export const STORAGE_PREFIX = IS_BETA ? 'beta:' : ''

if (IS_BETA) {
  const proto = Storage.prototype
  const { getItem, setItem, removeItem } = proto
  proto.getItem = function (k: string) { return getItem.call(this, STORAGE_PREFIX + k) }
  proto.setItem = function (k: string, v: string) { setItem.call(this, STORAGE_PREFIX + k, v) }
  proto.removeItem = function (k: string) { removeItem.call(this, STORAGE_PREFIX + k) }
}
