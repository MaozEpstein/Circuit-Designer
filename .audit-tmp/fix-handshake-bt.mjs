import { readFileSync, writeFileSync } from 'node:fs';
const p = 'IQ/timing-cdc/index.js';
let src = readFileSync(p, 'utf8');
const BT = String.fromCharCode(96);  // `

// Replace `bus_data` → \`bus_data\` only in the recently-injected table rows.
const replacements = [
  [`A: ${BT}bus_data${BT} יציב, ${BT}req=1${BT}`, `A: \\${BT}bus_data\\${BT} יציב, \\${BT}req=1\\${BT}`],
  [`B רואה ${BT}req_sync=1${BT} (אחרי 2 cycles sync), דוגם bus, ${BT}ack=1${BT}`, `B רואה \\${BT}req_sync=1\\${BT} (אחרי 2 cycles sync), דוגם bus, \\${BT}ack=1\\${BT}`],
  [`A רואה ${BT}ack_sync=1${BT} (אחרי 2 cycles), ${BT}req=0${BT}`, `A רואה \\${BT}ack_sync=1\\${BT} (אחרי 2 cycles), \\${BT}req=0\\${BT}`],
  [`B רואה ${BT}req_sync=0${BT}, ${BT}ack=0${BT}`, `B רואה \\${BT}req_sync=0\\${BT}, \\${BT}ack=0\\${BT}`],
];

for (const [from, to] of replacements) {
  const before = src.length;
  src = src.replace(from, to);
  console.log(`  replaced (${before === src.length ? 'NO CHANGE' : 'ok'}): ${from.slice(0, 30)}...`);
}
writeFileSync(p, src);
