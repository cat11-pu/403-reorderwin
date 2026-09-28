import assert from "node:assert";
import { insInto, overCap, droppedOf } from "../reorder.js";
import { step, close } from "../reorderrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, cap: 2,
  state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
  events: [{ id: 1, kind: "push", at: 5, value: 1 }],
  bad_at_code: "E_BAD_AT", bad_value_code: "E_BAD_VALUE",
  empty_code: "E_EMPTY", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("insInto returns a list", () => {
  assert.ok(Array.isArray(insInto([[5, 1]], 3, 2)));
});

check("overCap returns a boolean", () => {
  assert.strictEqual(typeof overCap([[5, 1]], 2), "boolean");
});

check("droppedOf returns a list", () => {
  assert.ok(Array.isArray(droppedOf([[5, 1]])));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count_events, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
