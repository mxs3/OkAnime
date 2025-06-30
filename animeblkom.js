function searchResults(html) {
    const results = [];
    const regex = /<a[^>]*href="([^"]+)"[^>]*>\s*<div[^>]*class="poster[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            title: match[3].trim(),
            image: match[2],
            url: match[1].startsWith("http") ? match[1] : "https://animeblkom.com" + match[1]
        });
    }
    return results;
}

function extractDetails(html) {
    const title = html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]?.trim() || "";
    const description = html.match(/<div[^>]*class="story"[^>]*>\s*<p[^>]*>(.*?)<\/p>/)?.[1]?.trim() || "";
    const image = html.match(/<div[^>]*class="poster[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/)?.[1] || "";
    return { title, description, image };
}

function extractEpisodes(html) {
    const episodes = [];
    const regex = /<a[^>]*href="([^"]+)"[^>]*class="episode"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
        episodes.push({
            title: match[1].split("/").pop(),
            url: match[1].startsWith("http") ? match[1] : "https://animeblkom.com" + match[1]
        });
    }
    return episodes.reverse();
}

async function extractStreamUrl(url) {
    const res = await fetch(url);
    const html = await res.text();
    const regex = /data-url="([^"]+)"[^>]*data-server="([^"]+)"/g;
    const streams = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        let streamUrl = match[1].startsWith("http") ? match[1] : "https://animeblkom.com" + match[1];
        let serverRes = await fetch(streamUrl);
        let serverHtml = await serverRes.text();
        const direct = serverHtml.match(/source src="([^"]+)"/)?.[1];
        if (direct) {
            streams.push({ name: match[2], url: direct });
        }
    }
    return streams;
}

defineModule({
    name: "AnimeBlkom",
    lang: "ar",
    type: "anime",
    author: "MxS3",
    version: "1.0.0",
    search: async (query) => {
        const res = await fetch(`https://animeblkom.com/search?query=${encodeURIComponent(query)}`);
        const html = await res.text();
        return searchResults(html);
    },
    extract: async (url) => {
        const res = await fetch(url);
        const html = await res.text();
        const details = extractDetails(html);
        const episodes = extractEpisodes(html);
        return { ...details, episodes };
    },
    watch: async (url) => {
        return await extractStreamUrl(url);
    }
});
