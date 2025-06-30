function searchResults(html) {
    const results = [];
    const itemRegex = /<div class="my-2 w-64[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    const items = html.match(itemRegex) || [];

    items.forEach((itemHtml) => {
        const titleMatch = itemHtml.match(/<h2[^>]*>(.*?)<\/h2>/);
        const hrefMatch = itemHtml.match(/<a\s+href="([^"]+)"\s*[^>]*>/);
        const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/);

        const title = decodeHTMLEntities(titleMatch?.[1]?.trim() ?? '');
        const href = hrefMatch?.[1]?.trim() ?? '';
        const image = imgMatch?.[1]?.trim() ?? '';

        if (title && href) {
            results.push({ title, href, image });
        }
    });

    return results;
}

function extractDetails(html) {
    const details = [];

    const description = (() => {
        const container = html.match(/<div class="py-4 flex flex-col gap-2">([\s\S]*?)<\/div>/);
        if (!container) return '';
        return [...container[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
            .map(m => decodeHTMLEntities(m[1].trim()))
            .join('\n\n');
    })();

    const airdate = (html.match(/<td[^>]*title="([^"]+)">[^<]+<\/td>/) || [])[1]?.trim() ?? '';

    const aliases = (() => {
        const div = html.match(/<div\s+class="flex flex-wrap[^"]+">([\s\S]*?)<\/div>/);
        if (!div) return '';
        const anchorRe = /<a[^>]*class="btn btn-md btn-plain !p-0"[^>]*>([^<]+)<\/a>/g;
        return [...div[1].matchAll(anchorRe)].map(m => m[1].trim()).join(', ');
    })();

    if (description && airdate) {
        details.push({ description, airdate, aliases });
    }

    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({ href: match[1], number: match[2] });
    }
    return episodes;
}

async function extractStreamUrl(html) {
    try {
        const serverRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        const matches = [...html.matchAll(serverRegex)];

        for (const match of matches) {
            const link = match[1];
            const name = match[2].trim();
            const fullUrl = link.startsWith("http") ? link : `https://animeblkom.com${link}`;

            const response = await fetchv2(fullUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
                    Referer: "https://animeblkom.com"
                }
            });

            const data = await response.text();

            const blkomMatch = data.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
            if (blkomMatch) {
                const qualities = extractQualities(data);
                return JSON.stringify({ server: name, streams: qualities });
            }

            const iframeSrc = data.match(/<iframe[^>]+src="([^"]+)"/i);
            if (iframeSrc) {
                return JSON.stringify({ server: name, url: iframeSrc[1], type: "external" });
            }
        }

        return null;
    } catch (err) {
        return null;
    }
}

function extractQualities(html) {
    const match = html.match(/var\s+videos\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return [];
    const raw = match[1];
    const regex = /\{\s*src:\s*'([^']+)'\s*[^}]*label:\s*'([^']*)'/g;

    const list = [];
    let m;
    while ((m = regex.exec(raw)) !== null) {
        list.push(m[2], m[1]);
    }

    return list;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
    return text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}
