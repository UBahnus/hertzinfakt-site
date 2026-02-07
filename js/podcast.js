const RSS_URL = "https://anchor.fm/s/ecdbc4a4/podcast/rss";
const PROXIES = [
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://corsproxy.io/?" + encodeURIComponent(u),
];

let _cache = null;

async function fetchRSS() {
  if (_cache) return _cache;

  let xml = null;

  // Try direct first (works if same-origin or CORS enabled)
  try {
    const r = await fetch(RSS_URL);
    if (r.ok) xml = await r.text();
  } catch (_) {}

  // Try proxies
  if (!xml) {
    for (const proxy of PROXIES) {
      try {
        const r = await fetch(proxy(RSS_URL));
        if (r.ok) { xml = await r.text(); break; }
      } catch (_) {}
    }
  }

  if (!xml) return null;
  _cache = xml;
  return xml;
}

function itunesTag(item, name) {
  // Namespace-safe: try both variants
  const el =
    item.getElementsByTagName("itunes:" + name)[0] ||
    item.getElementsByTagName(name)[0];
  return el ? el.textContent.trim() : "";
}

function parseAudioUrl(raw) {
  const m = raw.match(/\/play\/\d+\/(https?%3A.+)$/);
  return m ? decodeURIComponent(m[1]) : raw;
}

function cleanDesc(raw) {
  const tmp = document.createElement("div");
  tmp.innerHTML = raw;
  let text = tmp.textContent || tmp.innerText || "";
  // Strip trailing boilerplate
  text = text.replace(
    /\s*(Folgt uns auf Instagram|Kommt auch gerne auf den offiziellen|Wir von der Podcast AG wünschen|Falls ihr auch an Podcasts|Den "HertzInFakt" könnt ihr euch).*/s,
    ""
  );
  return text.trim();
}

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str);
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function getEpisodes() {
  const xml = await fetchRSS();
  if (!xml) return null;

  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = doc.querySelectorAll("item");

  return Array.from(items).map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const rawDesc = item.querySelector("description")?.textContent?.trim() || "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim() || "";
    const enclosure = item.querySelector("enclosure");
    const rawUrl = enclosure?.getAttribute("url") || "";
    const duration = itunesTag(item, "duration");
    const epNum = itunesTag(item, "episode");

    return {
      title,
      desc: cleanDesc(rawDesc),
      date: fmtDate(pubDate),
      rawDate: pubDate,
      audio: parseAudioUrl(rawUrl),
      duration,
      num: epNum,
      slug: epNum ? "folge-" + epNum : "trailer",
      label: epNum ? "#" + epNum : "T",
      labelLong: epNum ? "Folge " + epNum : "Trailer",
    };
  });
}
