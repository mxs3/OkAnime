function defineModule(module) {
    return module;
}

export default defineModule({
    id: "animeblkom",
    name: "AnimeBlkom",
    version: "1.0.0",
    icon: "https://animeblkom.com/images/favicon.ico",
    baseUrl: "https://animeblkom.com",
    author: { name: "MxS3" },

    search: async function (query) {
        const url = `https://animeblkom.com/search?query=${encodeURIComponent(query)}`;
        const html = await tryBypass(url);
        return searchResults(html);
    },

    fetch: async function (url) {
        const html = await tryBypass(url);
        return {
            details: extractDetails(html),
            episodes: extractEpisodes(html)
        };
    },

    watch: async function (url) {
        const html = await tryBypass(url);
        return JSON.parse(await extractStreamUrl(html));
    }
});

function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="my-2 w-64[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];

    items.forEach((itemHtml) => {
        const titleMatch = itemHtml.match(/<h2[^>]*>(.*?)<\/h2>/);
        const hrefMatch = itemHtml.match(/<a\s+href="([^"]+)"\s*[^>]*>/);
        const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/);

        const title = decode(titleMatch?.[1] ?? "");
        const href = hrefMatch?.[1] ?? "";
        const image = imgMatch?.[1] ?? "";

        if (title && href) {
            results.push({
                title,
                image: image.startsWith("http") ? image : "https://animeblkom.com" + image,
                url: href.startsWith("http") ? href : "https://animeblkom.com" + href
            });
        }
    });

    return results;
}

function extractDetails(html) {
    const details = [];

    const descMatch = html.match(/<div class="py-4 flex flex-col gap-2">([\s\S]*?)<\/div>/);
    let description = "";
    if (descMatch) {
        const pTags = [...descMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1].trim());
        description = decode(pTags.join("\n\n"));
    }

    const airdateMatch = html.match(/<td[^>]*title="([^"]+)">[^<]+<\/td>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : "";

    const genres = [];
    const genreMatch = html.match(/<div[^>]*class="flex flex-wrap[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (genreMatch) {
        const genreTags = [...genreMatch[1].matchAll(/<a[^>]*>([^<]+)<\/a>/g)];
        genreTags.forEach(m => genres.push(m[1].trim()));
    }

    if (description || airdate) {
        details.push({
            description,
            aliases: genres.join(", "),
            airdate
        });
    }

    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+\/episode\/[^"]+)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/g)];

    matches.forEach(m => {
        episodes.push({
            number: m[2],
            url: "https://animeblkom.com" + m[1]
        });
    });

    return episodes;
}

async function extractStreamUrl(html) {
    const sourceMatch = html.match(/data-video-source="([^"]+)"/);
    let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
    if (!embedUrl) return null;

    const cinemaMatch = html.match(/url\.searchParams\.append\(['"]cinema['"]\s*,\s*(\d+)\s*\)/);
    const lastMatch = html.match(/url\.searchParams\.append\(['"]last['"]\s*,\s*(\d+)\s*\)/);

    if (cinemaMatch) embedUrl += `&cinema=${cinemaMatch[1]}`;
    if (lastMatch) embedUrl += `&last=${lastMatch[1]}`;
    embedUrl += `&next-image=undefined`;

    const response = await fetchv2(embedUrl);
    const data = await response.text();
    const streams = extractQualities(data);

    return JSON.stringify({ streams });
}

function extractQualities(html) {
    const match = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return [];

    const raw = match[1];
    const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;
    const list = [];
    let m;

    while ((m = regex.exec(raw)) !== null) {
        list.push({ quality: m[2], url: m[1] });
    }

    return list;
}

function decode(text) {
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    for (const e in entities) {
        text = text.replace(new RegExp(e, 'g'), entities[e]);
    }
    return text;
}

async function tryBypass(url) {
    let html = await fetchText(url);
    if (html.includes("Just a moment...") || html.includes("__cf_chl_tk")) {
        html = await fetchText(`https://corsproxy.io/?${url}`);
    }
    return html;
}

async function fetchText(url) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });
    return await res.text();
}
