async function searchResults(keyword) {
    const searchUrl = `https://www.animeblkom.com/search?keyword=${encodeURIComponent(keyword)}`;
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0 Safari/537.36",
        "Accept": "text/html",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.animeblkom.com/"
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
