import fs from "node:fs";
import { insInto, overCap, droppedOf } from "./reorder.js";
import { step, close } from "./reorderrun.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/stream.json", "utf8"));
const events = spec.events || [];
const half = Math.ceil(events.length / 2);
const first = step(spec);
const closed = close(Object.assign({}, spec, { state: first.state }));
const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
const replay = step(Object.assign({}, spec, { state: closed.state }));
const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
const fullClosed = close(Object.assign({}, spec, { state: full.state }));
const fingerprint = function (state) {
  return JSON.stringify({
    buf: state.buf, out: state.out, forced: state.forced, flushes: state.flushes,
    ledger: state.ledger, applied: state.applied.length
  });
};

emit("收尾后缓冲 =", JSON.stringify(closed.state.buf));
emit("收尾后吐出序列 =", JSON.stringify(closed.state.out));
emit("收尾后强制吐出次数 =", closed.state.forced);
emit("收尾后冲刷次数 =", closed.state.flushes);
emit("首轮处理条数 =", first.served);
emit("二档处理条数 =", wide.served);
emit("两个预算档处理不同 =", first.served !== wide.served);
emit("收尾前待处理账 =", first.ledger_before);
emit("压在账上的请求 =", JSON.stringify(first.ledger));
emit("收尾补齐条数 =", closed.catchup);
emit("拆两轮中间态不同 =", fingerprint(r2.state) !== fingerprint(first.state));
emit("拆两轮收尾态一致 =", fingerprint(closedTwo.state) === fingerprint(closed.state));
emit("重放新处理 =", replay.served);
emit("工作计数未超上界 =", first.judged <= first.judged_bound);
emit("与全量对照差异 =", fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "flush" }] }));
  emit("空缓冲冲刷报码", "没有报错");
} catch (error) {
  emit("空缓冲冲刷报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "push", at: -1, value: 3 }] }));
  emit("时刻非法报码", "没有报错");
} catch (error) {
  emit("时刻非法报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "flush" }] }));
  emit("空缓冲冲刷报码", "没有报错");
} catch (error) {
  emit("空缓冲冲刷报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "push", at: -1, value: 3 }] }));
  emit("时刻非法报码", "没有报错");
} catch (error) {
  emit("时刻非法报码", error && error.code ? error.code : String(error.message));
}
try {
  step(Object.assign({}, { budget: 1, cap: 2,
    state: { buf: [], out: [], forced: 0, flushes: 0, ledger: [], applied: [] },
    events: [{ id: 1, kind: "peek" }] }));
  emit("事件不合法报码", "没有报错");
} catch (error) {
  emit("事件不合法报码", error && error.code ? error.code : String(error.message));
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "收尾后缓冲": [
    [
      9,
      5
    ]
  ],
  "收尾后吐出序列": [
    [
      3,
      2
    ],
    [
      5,
      1
    ],
    [
      6,
      4
    ],
    [
      7,
      3
    ]
  ],
  "收尾后强制吐出次数": 2,
  "收尾后冲刷次数": 1,
  "首轮处理条数": 3,
  "二档处理条数": 5,
  "两个预算档处理不同": true,
  "收尾前待处理账": 3,
  "压在账上的请求": [
    [
      "push",
      6,
      4
    ],
    [
      "flush"
    ],
    [
      "push",
      9,
      5
    ]
  ],
  "收尾补齐条数": 3,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "重放新处理": 0,
  "工作计数未超上界": true,
  "与全量对照差异": 0,
  "空缓冲冲刷报码": "E_EMPTY",
  "时刻非法报码": "E_BAD_AT",
  "事件不合法报码": "E_BAD_EVENT"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
