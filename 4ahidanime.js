async function httpRequest(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}

async function search(query) {
  const html = await httpRequest(`https://shahiid-anime.net/anime-search/?q=${encodeURIComponent(query)}`);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const items = Array.from(doc.querySelectorAll("#archive h2")).slice(0, 20);
  return items.map(el => {
    const a = el.querySelector("a");
    return {
      id: a.href,
      title: a.innerText.trim(),
      image: a.querySelector("img")?.src || "",
      description: ""
    };
  });
}

async function fetchAnime(id) {
  const html = await httpRequest(id);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("h1")?.innerText.trim() || "";
  const eps = Array.from(doc.querySelectorAll(".episode-list a")).map(a => ({
    id: a.href,
    title: a.innerText.trim()
  }));
  return { title, episodes: eps };
}

async function fetchEpisode(id) {
  const html = await httpRequest(id);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const video = doc.querySelector("iframe[src]")?.src
    || doc.querySelector("video source[src]")?.src;
  if (!video) throw new Error("Video link not found");
  return { url: video };
}

module.exports = { search, fetchAnime, fetchEpisode };
