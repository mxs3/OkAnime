async function searchResults(keyword) {
    const searchUrl = `https://www.animeblkom.com/search?keyword=${encodeURIComponent(keyword)}`;
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0 Safari/537.36"
    };
    const res = await fetchv2(searchUrl, headers);
    const html = await res.text();

    const results = [];
    const regex = /<a class="anime-card" href="([^"]+)"[^>]*>\s*<div class="anime-img">\s*<img src="([^"]+)"[^>]*alt="([^"]+)"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: decodeHTMLEntities(match[3].trim()),
            href: match[1].trim(),
            image: match[2].trim()
        });
    }
    return JSON.stringify(results);
}

async function extractDetails(url) {
    const res = await fetchv2(url);
    const html = await res.text();

    const descMatch = html.match(/<div class="synopsis">\s*<p>(.*?)<\/p>/);
    const desc = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "N/A";

    const genreMatches = [...html.matchAll(/<a href="\/genres\?[^"]+"[^>]*>([^<]+)<\/a>/g)];
    const genres = genreMatches.map(m => decodeHTMLEntities(m[1]));

    return JSON.stringify([{
        description: desc,
        aliases: genres.join(", "),
        airdate: ""
    }]);
}

async function extractEpisodes(url) {
    const res = await fetchv2(url);
    const html = await res.text();

    const episodeMatches = [...html.matchAll(/<a class="episode-link" href="([^"]+)">\s*<span[^>]*>(\d+)<\/span>/g)];
    const episodes = episodeMatches.map(m => ({
        number: parseInt(m[2]),
        href: m[1].trim()
    }));

    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const res = await fetchv2(url);
    const html = await res.text();

    const iframeMatch = html.match(/<iframe[^>]*src="([^"]+)"[^>]*>/);
    const iframeSrc = iframeMatch ? iframeMatch[1] : "";

    if (!iframeSrc) {
        const mp4Match = html.match(/<source src="([^"]+\.mp4)"[^>]*>/);
        if (mp4Match) {
            return JSON.stringify({
                stream: mp4Match[1],
                headers: {}
            });
        }
    }

    return JSON.stringify({
        stream: iframeSrc,
        headers: { Referer: url }
    });
}

function decodeHTMLEntities(text) {
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    return text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
               .replace(/&(quot|amp|apos|lt|gt);/g, (match) => entities[match] || match);
}
