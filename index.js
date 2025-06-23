export default class Source {
  constructor() {
    this.name = "ArabSeed";
    this.baseUrl = "https://m1.arabseed.lol";
  }

  async search(query) {
    const res = await fetch(`${this.baseUrl}/?s=${encodeURIComponent(query)}`);
    const doc = new DOMParser().parseFromString(await res.text(),"text/html");
    return Array.from(doc.querySelectorAll("article .movie > a")).map(el=>({
      title: el.querySelector("h2")?.textContent.trim()|| "",
      url: el.href,
      poster: el.querySelector("img")?.src || ""
    }));
  }

  async load(url) {
    const res = await fetch(url);
    const doc = new DOMParser().parseFromString(await res.text(),"text/html");
    const episodes = [];
    const vids = doc.querySelectorAll(".movurl a");
    vids.forEach(el=>episodes.push({title: el.textContent.trim(), url: el.href}));
    return {
      title: doc.querySelector("h1")?.textContent.trim() || "",
      poster: doc.querySelector(".img-thumbnail")?.src || "",
      episodes
    };
  }

  async play(url) {
    const res = await fetch(url);
    const doc = new DOMParser().parseFromString(await res.text(),"text/html");
    const frame = doc.querySelector("iframe");
    const videoUrl = frame?.src || "";
    return {url: videoUrl, isM3U8: videoUrl.includes(".m3u8")};
  }
}
