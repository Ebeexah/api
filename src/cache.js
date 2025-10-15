import fs from "fs";
const FILE = "/tmp/data.json";

function ensureFile() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ subs: [], cache: {} }, null, 2));
}
function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
function writeAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getCache(user) {
  const data = readAll();
  return data.cache[user] || null;
}
export function setCache(user, info) {
  const data = readAll();
  data.cache[user] = { ...info, cached_at: Date.now() };
  writeAll(data);
}
export function getSubs() {
  return readAll().subs;
}
export function addSub(user) {
  const data = readAll();
  if (!data.subs.includes(user)) data.subs.push(user);
  writeAll(data);
}
export function removeSub(user) {
  const data = readAll();
  data.subs = data.subs.filter((u) => u !== user);
  writeAll(data);
}
