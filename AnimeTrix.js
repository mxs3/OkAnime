function defineModule({ meta, search, fetchAnime, fetchEpisodeSources }) {
  return { meta, search, fetchAnime, fetchEpisodeSources };
}

function decodeHTMLEntities(text) {
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
  const entities = {
    '&quot;': '"', '&amp;': '&', '&apos;': "'", '&lt;': '<', '&gt;': '>'
  };
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  return text;
}

function extractQualities(html) {
  const match = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;
  const list = [];
  let m;
  while ((m = regex.exec(match[1])) !== null) {
    list.push(m[2], m[1]);
  }
  return list;
}

export default defineModule({
  meta: {
    name: 'Animeiat',
    version: '1.0.0',
    author: 'MxS3',
    url: 'https://ww1.animeiat.tv',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=animeiat.tv',
  },

  async search(query) {
    const res = await fetch(`https://ww1.animeiat.tv/?s=${encodeURIComponent(query)}`);
    const html = await res.text();
    const results = [];
    const regex = /<div class="post-thumb">[\s\S]*?<a href="(.*?)">[\s\S]*?<img src="(.*?)"[\s\S]*?<h3 class="post-title">(.*?)<\/h3>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        id: match[1],
        title: decodeHTMLEntities(match[3].trim()),
        image: match[2],
      });
    }
    return results;
  },

  async fetchAnime(url) {
    const res = await fetch(url);
    const html = await res.text();
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    const title = titleMatch ? decodeHTMLEntities(titleMatch[1].trim()) : 'Unknown title';

    const episodes = [];
    const epRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    let match;
    while ((match = epRegex.exec(html)) !== null) {
      episodes.push({
        id: match[1],
        title: `الحلقة ${match[2]}`,
      });
    }

    return { title, episodes };
  },

  async fetchEpisodeSources(episodeUrl) {
    const res = await fetch(episodeUrl);
    const html = await res.text();

    const sourceMatch = html.match(/data-video-source="([^"]+)"/);
    let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
    if (!embedUrl) return [];

    const cinemaMatch = html.match(/url\.searchParams\.append\(\s*['"]cinema['"]\s*,\s*(\d+)\s*\)/);
    const lastMatch = html.match(/url\.searchParams\.append\(\s*['"]last['"]\s*,\s*(\d+)\s*\)/);
    const cinemaNum = cinemaMatch ? cinemaMatch[1] : undefined;
    const lastNum = lastMatch ? lastMatch[1] : undefined;

    if (cinemaNum) embedUrl += `&cinema=${cinemaNum}`;
    if (lastNum) embedUrl += `&last=${lastNum}`;
    embedUrl += `&next-image=undefined`;

    const embedRes = await fetch(embedUrl);
    const embedHtml = await embedRes.text();
    const qualities = extractQualities(embedHtml);

    return [
      {
        name: 'Animeiat Player',
        type: 'mp4',
        qualities: qualities,
      }
    ];
  }
});
