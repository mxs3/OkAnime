export default class Source {
  constructor() {
    this.name = "ArabSeed";
    this.baseUrl = "https://m1.arabseed.lol";
  }

  async search(query) {
    const res = await fetch(`${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return Array.from(doc.querySelectorAll(".Item")).map(el => ({
      title: el.querySelector(".Title").textContent.trim(),
      url: el.querySelector("a").href,
      poster: el.querySelector("img").src
    }));
  }

  async load(url) {
    const res = await fetch(url);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const episodes = Array.from(doc.querySelectorAll(".episodes li a")).map(el => ({
      title: el.textContent.trim(),
      url: el.href
    }));
    return {
      title: doc.querySelector("h1").textContent.trim(),
      poster: doc.querySelector(".poster img")?.src || "",
      episodes
    };
  }

  async play(url) {
    const res = await fetch(url);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const iframe = doc.querySelector("iframe");
    const playerRes = await fetch(iframe.src);
    const playerDoc = new DOMParser().parseFromString(await playerRes.text(), "text/html");
    const videoUrl = playerDoc.querySelector("source")?.src;
    return {
      url: videoUrl,
      isM3U8: videoUrl.includes(".m3u8")
    };
  }
}
