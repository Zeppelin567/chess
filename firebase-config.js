// ── Online play setup ─────────────────────────────────────────────
// To enable "🌐 Online play" (two players, room code, realtime sync):
//
//  1. Go to https://console.firebase.google.com → "Add project"
//     (you can skip Google Analytics).
//  2. Left menu → Build → Realtime Database → "Create database"
//     → choose "Start in test mode".
//  3. Click the gear ⚙ → Project settings → "Your apps" → Web (</>) →
//     "Register app". Copy the firebaseConfig values below.
//  4. In Realtime Database → Rules tab, paste:
//
//       {
//         "rules": {
//           "rooms": {
//             "$room": { ".read": true, ".write": true }
//           }
//         }
//       }
//
//    and Publish. (Open rules are fine for casual play with friends;
//    don't store anything sensitive in room codes.)
//
// Until a real config is pasted here, the page shows
// "Online play is not configured yet".
var firebaseConfig = {
  apiKey: "AIzaSyAyVSEjLBG9O6e3ObNG0ODIy_G5FELmruc",
  authDomain: "chess-bca6d.firebaseapp.com",
  databaseURL: "https://chess-bca6d-default-rtdb.firebaseio.com",
  projectId: "chess-bca6d",
};
var FIREBASE_CONFIGURED =
  typeof firebaseConfig !== "undefined" &&
  firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE";
