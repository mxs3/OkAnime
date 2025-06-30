function searchResults(html) {
    if (typeof html !== 'string') return [];
    const results = [];
    const items = [...html.matchAll(/<a[^>]+class="result[^"]*"[^>]*>[\s\S]*?<\/a>/g)];
    items.forEach((m) => {
        const itemHtml = m[0];
        const titleMatch = itemHtml.match(/<h2[^>]*>(.*?)<\/h2>/);
        const hrefMatch = itemHtml.match(/href="([^"]+)"/);
        const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/);
        const title = titleMatch?.[1]?.trim() ?? '';
        const href = hrefMatch?.[1]?.trim() ?? '';
        const image = imgMatch?.[1]?.trim() ?? '';
        if (title && href) {
            results.push({
                title,
                url: href.startsWith('http') ? href : 'https://animeblkom.com' + href,
                image
            });
        }
    });
    return results;
}

function extractDetails(html) {
    const containerMatch = html.match(/<div class="py-4 flex flex-col gap-2">\s*((?:<p class="[^"]*">[\s\S]*?<\/p>\s*)+)<\/div>/);
    let description = "";
    if (containerMatch) {
        const pBlock = containerMatch[1];
        const pRegex = /<p class="[^"]*">([\s\S]*?)<\/p>/g;
        const matches = [...pBlock.matchAll(pRegex)].map(m => m[1].trim()).filter(t => t.length > 0);
        description = decodeHTMLEntities(matches.join("\n\n"));
    }
    const airdateMatch = html.match(/<td[^>]*title="([^"]+)">[^<]+<\/td>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : "";
    const genres = [];
    const aliasesMatch = html.match(/<div\s+class="flex flex-wrap[^"]+">([\s\S]*?)<\/div>/);
    const inner = aliasesMatch ? aliasesMatch[1] : "";
    const anchorRe = /<a[^>]*class="btn btn-md btn-plain !p-0"[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = anchorRe.exec(inner)) !== null) {
        genres.push(m[1].trim());
    }
    return {
        title: "",
        description,
        genres: genres.join(", "),
        releaseDate: airdate,
        image: ""
    };
}

function extractEpisodes(html) {
    const episodes = [];
    const htmlRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    let matches;
    if ((matches = html.match(htmlRegex))) {
        matches.forEach(link => {
            const hrefMatch = link.match(/href="([^"]+)"/);
            const numberMatch = link.match(/الحلقة\s+(\d+)/);
            if (hrefMatch && numberMatch) {
                const href = hrefMatch[1];
                const number = numberMatch[1];
                episodes.push({
                    title: "الحلقة " + number,
                    url: href.startsWith('http') ? href : 'https://animeblkom.com' + href
                });
            }
        });
    }
    return episodes;
}

async function extractStreamUrl(url) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://animeblkom.com/'
        }
    });
    const html = await res.text();
    const serverRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    const matches = [...html.matchAll(serverRegex)];
    for (const m of matches) {
        const link = m[1];
        const name = m[2].trim();
        const full = link.startsWith('http') ? link : 'https://animeblkom.com' + link;
        const serverRes = await fetch(full, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://animeblkom.com/'
            }
        });
        const data = await serverRes.text();
        const blkomM = data.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
        if (blkomM) {
            const qs = [...blkomM[1].matchAll(/\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g)];
            const arr = [];
            qs.forEach(q => arr.push({ quality: q[2], url: q[1] }));
            return arr;
        }
        const iM = data.match(/<iframe[^>]+src="([^"]+)"/i);
        if (iM) return [{ name, url: iM[1], type: 'external' }];
    }
    return [];
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = {
        '&quot;': '"',
        '&amp;': '&',
        '&apos;': "'",
        '&lt;': '<',
        '&gt;': '>'
    };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}

module.exports = {
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
};
