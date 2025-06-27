function httpRequest(url) {
  return fetch(url).then(res => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
  });
}

async function search(query) {
  const html = await httpRequest(`https://shahiid-anime.net/anime-search/?q=${encodeURIComponent(query)}`);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll(".anime-block")).map(el => ({
    id: el.querySelector("a").href,
    title: el.querySelector("h3").innerText.trim(),
    image: el.querySelector("img").src,
    description: el.querySelector(".desc")?.innerText.trim() || ""
  }));
}

async function fetchAnime(id) {
  const html = await httpRequest(id);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.querySelector("h1")?.innerText.trim();
  const episodes = Array.from(doc.querySelectorAll(".episode-list a")).map(a => ({
    id: a.href,
    title: a.innerText.trim()
  }));
  return { title, episodes };
}

async function fetchEpisode(id) {
  const html = await httpRequest(id);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const video = doc.querySelector("iframe[src]")?.src || doc.querySelector("video source[src]")?.src;
  if (!video) throw new Error("Video link not found");
  return { url: video };
}

module.exports = { search, fetchAnime, fetchEpisode };
