function searchResults(html) {
    if (typeof html !== 'string') return [];

    const results = [];
    const cardRegex = /<div class="Poster">[\s\S]*?<a href="([^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"/g;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
        results.push({
            title: decodeHTMLEntities(match[2].trim()),
            image: match[3],
            href: match[1]
        });
    }

    return results;
}

function extractDetails(html) {
    const details = [];

    const descMatch = html.match(/<div class="Description">[\s\S]*?<p>(.*?)<\/p>/);
    const description = descMatch ? decodeHTMLEntities(descMatch[1].trim()) : "";

    const genreRegex = /<a[^>]+href="[^"]+"[^>]*rel="tag"[^>]*>([^<]+)<\/a>/g;
    const genres = [];
    let genreMatch;
    while ((genreMatch = genreRegex.exec(html)) !== null) {
        genres.push(genreMatch[1].trim());
    }

    const airdateMatch = html.match(/<span>تاريخ الإصدار :<\/span>\s*([^<]+)<\/li>/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : "";

    if (description || genres.length || airdate) {
        details.push({
            description: description,
            aliases: genres.join(', '),
            airdate: airdate,
        });
    }

    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const regex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
        episodes.push({
            href: match[1],
            number: match[2]
        });
    }

    return episodes;
}

async function extractStreamUrl(html) {
    try {
        const sourceMatch = html.match(/data-video-source="([^"]+)"/);
        let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
        if (!embedUrl) return null;

        embedUrl += `&next-image=undefined`;

        const response = await fetchv2(embedUrl);
        const data = await response.text();

        const streams = extractQualities(data).filter((_, i) => i % 2 === 0 ? data.includes("eg.megamax.cam") : false);

        return JSON.stringify({ streams });
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
        list.push({
            quality: m[2],
            url: m[1]
        });
    }

    // هنا بنرجع فقط السيرفر اللي فيه megamax
    return list.filter(v => v.url.includes("eg.megamax.cam"));
}

function decodeHTMLEntities(text) {
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
