// ES-module adapter for the design kit's `sprites.js`.
// `sprites.js` is an IIFE that assigns the API to `globalThis.AstroSprites`.
// Importing it here runs that IIFE before this module body evaluates,
// so the global is guaranteed to be populated by the time we read it.
import './sprites.js'

/** @type {typeof globalThis.AstroSprites} */
const AstroSprites = globalThis.AstroSprites

if (!AstroSprites) {
  throw new Error('AstroBlaster: sprite engine failed to initialise')
}

export default AstroSprites
