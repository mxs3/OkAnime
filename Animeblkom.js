function searchResults(html) {
    const results = [];

    const itemRegex = /<a[^>]+href="(\/anime\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>(.*?)<\/h2>/g;
    let match;

    while ((match = itemRegex.exec(html)) !== null) {
        results.push({
            title: decodeHTMLEntities(match[3].trim()),
            image: match[2].trim(),
            href: "https://www.animeblkom.com" + match[1].trim()
        });
    }

    return results;
}

function extractDetails(html) {
    const descriptionMatch = html.match(/<p class="[^"]*text-justify[^"]*">([\s\S]*?)<\/p>/);
    const airdateMatch = html.match(/<td[^>]*title="([^"]+)"/);
    const genres = [];

    const genresRegex = /<a[^>]*class="btn btn-md btn-plain !p-0"[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = genresRegex.exec(html)) !== null) {
        genres.push(m[1].trim());
    }

    return [{
        description: decodeHTMLEntities(descriptionMatch?.[1]?.trim() ?? ""),
        aliases: genres.join(", "),
        airdate: airdateMatch?.[1]?.trim() ?? ""
    }];
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]+)"[^>]*>[\s\S]*?الحلقة\s+(\d+)/gi;
    let match;

    while ((match = episodeRegex.exec(html)) !== null) {
        episodes.push({
            href: "https://www.animeblkom.com" + match[1],
            number: match[2]
        });
    }

    return episodes;
}

async function extractStreamUrl(html) {
    try {
        const match = html.match(/data-video-source="([^"]+)"/);
        if (!match) return null;

        let embedUrl = match[1].replace(/&amp;/g, '&');

        const response = await fetchv2(embedUrl);
        const data = await response.text();

        const qualities = extractQualities(data);

        return JSON.stringify({
            streams: qualities
        });
    } catch (err) {
        console.error(err);
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
    if (!text) return "";
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));

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
