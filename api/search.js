// Vercel Serverless Function: GET /api/search?q=tea%20packaging&source=all&license=all
const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "s-maxage=60, stale-while-revalidate=300"
};
const clean = (v = "") => String(v).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
async function getJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal, headers: { "User-Agent": "CreativeRadar/1.0 (public image search)", ...(options.headers || {}) } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}
async function openverse(q, license) {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", q); url.searchParams.set("page_size", "24");
  if (license === "commercial") url.searchParams.set("license_type", "commercial");
  const data = await getJson(url.toString());
  return (data.results || []).map(x => ({
    id: `openverse-${x.id}`, source: "Openverse",
    title: clean(x.title || x.name || "Untitled image"),
    thumbnail: x.thumbnail || x.url, imageUrl: x.url,
    pageUrl: x.foreign_landing_url || x.detail_url || x.url,
    creator: clean(x.creator || ""), license: clean(x.license || x.license_version || x.license_title || "")
  })).filter(x => x.thumbnail && x.pageUrl);
}
async function commons(q, license) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  const params = { action:"query", generator:"search", gsrsearch:`filetype:bitmap ${q}`, gsrnamespace:"6", gsrlimit:"24", prop:"imageinfo|info", inprop:"url", iiprop:"url|extmetadata", iiurlwidth:"500", format:"json", origin:"*" };
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const data = await getJson(url.toString());
  return Object.values(data.query?.pages || {}).map(p => {
    const info = p.imageinfo?.[0] || {}, meta = info.extmetadata || {};
    const license = clean(meta.LicenseShortName?.value || meta.UsageTerms?.value || "");
    return { id:`commons-${p.pageid}`, source:"Wikimedia Commons", title:clean(p.title || ""),
      thumbnail:info.thumburl || info.url, imageUrl:info.url, pageUrl:p.fullurl || info.descriptionurl,
      creator:clean(meta.Artist?.value || ""), license };
  }).filter(x => x.thumbnail && x.pageUrl && (license !== "commercial" || /CC0|Public domain|CC BY|CC BY-SA/i.test(x.license)));
}
module.exports = async (req, res) => {
  res.setHeader("Content-Type", headers["Content-Type"]);
  res.setHeader("Cache-Control", headers["Cache-Control"]);
  if (req.method !== "GET") return res.status(405).json({ error:"Only GET is supported", results:[] });
  const q = String(req.query.q || "").trim().slice(0, 180);
  const source = ["all","openverse","commons"].includes(req.query.source) ? req.query.source : "all";
  const license = req.query.license === "commercial" ? "commercial" : "all";
  if (!q) return res.status(400).json({ error:"Missing query parameter: q", results:[] });
  const jobs = [];
  if (source === "all" || source === "openverse") jobs.push(["Openverse", () => openverse(q, license)]);
  if (source === "all" || source === "commons") jobs.push(["Wikimedia Commons", () => commons(q, license)]);
  const settled = await Promise.allSettled(jobs.map(async ([name, fn]) => ({ name, items: await fn() })));
  const results = [], errors = [];
  settled.forEach((entry, i) => {
    if (entry.status === "fulfilled") results.push(...entry.value.items);
    else errors.push(`${jobs[i][0]}：${entry.reason?.message || "请求失败"}`);
  });
  // Keep API errors explicit; never substitute sample imagery.
  return res.status(results.length ? 200 : (errors.length ? 502 : 200)).json({ query:q, results, errors, count:results.length, generatedAt:new Date().toISOString() });
};