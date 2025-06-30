async function searchResults(keyword) {
    const proxy = "https://animeblkom-cf-proxy.mxs.workers.dev/proxy/";
    const originalUrl = `https://www.animeblkom.com/search?keyword=${encodeURIComponent(keyword)}`;
    const fullUrl = proxy + encodeURIComponent(originalUrl);

    const res = await fetchv2(fullUrl);
    const html = await res.text();

    const results = [];
    const regex = /<a class="anime-card" href="([^"]+)"[^>]*>\\s*<div class="anime-img">\\s*<img src="([^"]+)"[^>]*alt="([^"]+)"/g;
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
    const proxy = "https://animeblkom-cf-proxy.mxs.workers.dev/proxy/";
    const fullUrl = proxy + encodeURIComponent(url);
    const res = await fetchv2(fullUrl);
    const html = await res.text();

    const descriptionMatch = html.match(/<div class="story">\\s*<p>(.*?)<\\/p>/s);
    const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "N/A";

    const typeMatch = html.match(/<li>\\s*<strong>التصنيف:\\s*<\\/strong>(.*?)<\\/li>/);
    const aliases = typeMatch ? decodeHTMLEntities(typeMatch[1].replace(/<[^>]+>/g, "").trim()) : "Unknown";

    const airDateMatch = html.match(/<li>\\s*<strong>تاريخ الانتاج:\\s*<\\/strong>(.*?)<\\/li>/);
    const airdate = airDateMatch ? decodeHTMLEntities(airDateMatch[1].replace(/<[^>]+>/g, "").trim()) : "Unknown";

    return JSON.stringify([{
        description,
        aliases,
        airdate: "Aired: " + airdate
    }]);
}

async function extractEpisodes(url) {
    const proxy = "https://animeblkom-cf-proxy.mxs.workers.dev/proxy/";
    const fullUrl = proxy + encodeURIComponent(url);
    const res = await fetchv2(fullUrl);
    const html = await res.text();

    const episodes = [];
    const epRegex = /<li>\\s*<a href="([^"]+)"[^>]*>\\s*<span[^>]*>(\\d+)<\\/span>/g;
    let match;
    while ((match = epRegex.exec(html)) !== null) {
        episodes.push({
            number: parseInt(match[2]),
            href: match[1]
        });
    }

    if (episodes.length === 0 && url.includes("/watch/")) {
        episodes.push({ number: 1, href: url });
    }

    return JSON.stringify(episodes);
}

async function extractStreamUrl(url) {
    const proxy = "https://animeblkom-cf-proxy.mxs.workers.dev/proxy/";
    const fullUrl = proxy + encodeURIComponent(url);
    const res = await fetchv2(fullUrl);
    const html = await res.text();

    const sources = [];
    const regex = /data-id="([^"]+)" data-type="([^"]+)" data-server="([^"]+)"/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        const embedId = match[1];
        const type = match[2];
        const server = match[3];

        const body = `id=${embedId}&type=${type}`;
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': url
        };

        try {
            const streamRes = await fetchv2(
                proxy + encodeURIComponent("https://www.animeblkom.com/ajax/watch"),
                headers,
                "POST",
                body
            );

            const json = await streamRes.json();
            if (json && json.embed_url) {
                sources.push({
                    title: server,
                    streamUrl: json.embed_url,
                    headers: { Referer: url },
                    subtitles: null
                });
            }
        } catch (err) {
            console.log("Stream error:", err);
        }
    }

    return JSON.stringify({ streams: sources, subtitles: null });
}

function decodeHTMLEntities(text) {
    const entities = {
        '&quot;': '\"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    return text.replace(/&#(\\d+);/g, (_, dec) => String.fromCharCode(dec))
               .replace(/&(quot|amp|apos|lt|gt);/g, match => entities[match] || match);
}
