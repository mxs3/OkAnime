const proxy = "https://animeblkom-cf-proxy.mxs.workers.dev/proxy/";

async function searchResults(keyword) {
    try {
        const url = `https://www.animeblkom.com/search?keyword=${encodeURIComponent(keyword)}`;
        const res = await fetchv2(proxy + encodeURIComponent(url));
        const html = await res.text();

        const results = [];
        const regex = /<a class="anime-card" href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: decodeHTMLEntities(match[3]),
                href: match[1],
                image: match[2]
            });
        }

        return JSON.stringify(results);
    } catch (err) {
        console.log("Search error:", err);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const res = await fetchv2(proxy + encodeURIComponent(url));
        const html = await res.text();

        const descriptionMatch = html.match(/<div class="anime-story">\s*<p>(.*?)<\/p>/s);
        const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : "No description";

        return JSON.stringify([{ description }]);
    } catch (err) {
        console.log("Details error:", err);
        return JSON.stringify([{ description: "Error loading description" }]);
    }
}

async function extractEpisodes(url) {
    try {
        const res = await fetchv2(proxy + encodeURIComponent(url));
        const html = await res.text();

        const episodes = [];
        const epRegex = /<a[^>]+href="([^"]+)"[^>]*class="episode"[^>]*>\s*<div[^>]*>.*?الحلقة\s*(\d+)/g;
        let match;
        while ((match = epRegex.exec(html)) !== null) {
            episodes.push({
                number: parseInt(match[2]),
                href: match[1]
            });
        }

        return JSON.stringify(episodes);
    } catch (err) {
        console.log("Episodes error:", err);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const res = await fetchv2(proxy + encodeURIComponent(url));
        const html = await res.text();

        const streams = [];

        // BlkomPlayer
        const mp4Match = html.match(/<source\s+src="([^"]+\.mp4)"\s+type="video\/mp4">/);
        if (mp4Match) {
            streams.push({
                title: "BlkomPlayer",
                streamUrl: mp4Match[1],
                headers: { Referer: url },
                subtitles: null
            });
        }

        // External servers
        const serverRegex = /data-id="([^"]+)"\s+data-type="([^"]+)"\s+data-server="([^"]+)"/g;
        let match;
        while ((match = serverRegex.exec(html)) !== null) {
            const [_, id, type, server] = match;
            const body = `id=${id}&type=${type}`;
            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Referer": url
            };

            const ajaxRes = await fetchv2(proxy + encodeURIComponent("https://www.animeblkom.com/ajax/watch"), headers, "POST", body);
            const json = await ajaxRes.json();

            if (json.embed_url) {
                streams.push({
                    title: server,
                    streamUrl: json.embed_url,
                    headers: { Referer: url },
                    subtitles: null
                });
            }
        }

        return JSON.stringify({ streams, subtitles: null });
    } catch (err) {
        console.log("Stream error:", err);
        return JSON.stringify({ streams: [], subtitles: null });
    }
}

function decodeHTMLEntities(text) {
    return text
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&(quot|amp|apos|lt|gt);/g, (m) => {
            return {
                "&quot;": '"',
                "&amp;": "&",
                "&apos;": "'",
                "&lt;": "<",
                "&gt;": ">"
            }[m];
        });
}
