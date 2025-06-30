function searchResults(html) {
    if (typeof html !== 'string') {
        console.error('Invalid HTML input: expected a string.');
        return [];
    }

    const results = [];
    const patterns = [
        /<div[^>]*class="[^"]*(?:anime|post|item|card)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        /<article[^>]*>[\s\S]*?<\/article>/gi,
        /<a[^>]*href="[^"]*anime[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
        /<div[^>]*class="[^"]*"[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/div>/gi
    ];

    let items = [];
    for (const pattern of patterns) {
        items = html.match(pattern) || [];
        if (items.length > 0) break;
    }

    items.forEach((itemHtml, index) => {
        try {
            if (typeof itemHtml !== 'string') {
                console.error(`Item ${index} is not a string.`);
                return;
            }

            const titlePatterns = [
                /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i,
                /<title[^>]*>(.*?)<\/title>/i,
                /<[^>]*title="([^"]+)"/i,
                /<[^>]*alt="([^"]+)"/i,
                />([^<]+)</
            ];

            let title = '';
            for (const pattern of titlePatterns) {
                const match = itemHtml.match(pattern);
                if (match && match[1] && match[1].trim()) {
                    title = match[1].trim();
                    break;
                }
            }

            const hrefMatch = itemHtml.match(/<a[^>]*href="([^"]+)"/i);
            const href = hrefMatch?.[1]?.trim() ?? '';

            const imgMatch = itemHtml.match(/<img[^>]*src="([^"]+)"/i);
            const imageUrl = imgMatch?.[1]?.trim() ?? '';

            if (title && href) {
                results.push({
                    title: decodeHTMLEntities(title),
                    image: imageUrl,
                    href: href.startsWith('http') ? href : `https://www.animeblkom.com${href}`
                });
            }
        } catch (err) {
            console.error(`Error processing item ${index}:`, err);
        }
    });

    console.log(`Found ${results.length} search results`);
    return results;
}

function extractDetails(html) {
    const details = [];
    let description = "";
    let airdate = "";
    const genres = [];

    const descriptionPatterns = [
        /<div class="py-4 flex flex-col gap-2">\s*((?:<p class="sm:text-\[1\.04rem\] leading-loose text-justify">[\s\S]*?<\/p>\s*)+)<\/div>/,
        /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i
    ];

    for (const pattern of descriptionPatterns) {
        const match = html.match(pattern);
        if (match) {
            if (pattern === descriptionPatterns[0]) {
                const pBlock = match[1];
                const pRegex = /<p class="sm:text-\[1\.04rem\] leading-loose text-justify">([\s\S]*?)<\/p>/g;
                const matches = [...pBlock.matchAll(pRegex)]
                    .map(m => m[1].trim())
                    .filter(text => text.length > 0);
                description = decodeHTMLEntities(matches.join("\n\n"));
            } else {
                description = decodeHTMLEntities(match[1].trim());
            }
            if (description) break;
        }
    }

    const airdatePatterns = [
        /<td[^>]*title="([^"]+)">[^<]+<\/td>/,
        /<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)<\/span>/i,
        /<div[^>]*class="[^"]*year[^"]*"[^>]*>([^<]+)<\/div>/i,
        /تاريخ\s*[:\-]?\s*([^<\n]+)/i,
        /البث\s*[:\-]?\s*([^<\n]+)/i
    ];

    for (const pattern of airdatePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            airdate = match[1].trim();
            break;
        }
    }

    const genrePatterns = [
        /<div\s+class="flex flex-wrap gap-2 lg:gap-4 text-sm sm:text-\[\.94rem\] -mt-2 mb-4">([\s\S]*?)<\/div>/,
        /<div[^>]*class="[^"]*genre[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*category[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    ];

    for (const pattern of genrePatterns) {
        const match = html.match(pattern);
        if (match) {
            const inner = match[1];
            const anchorPatterns = [
                /<a[^>]*class="btn btn-md btn-plain !p-0"[^>]*>([^<]+)<\/a>/g,
                /<a[^>]*>([^<]+)<\/a>/g,
                /<span[^>]*>([^<]+)<\/span>/g
            ];

            for (const anchorPattern of anchorPatterns) {
                let m;
                while ((m = anchorPattern.exec(inner)) !== null) {
                    genres.push(m[1].trim());
                }
                if (genres.length > 0) break;
            }
            if (genres.length > 0) break;
        }
    }

    if (description || airdate || genres.length > 0) {
        details.push({
            description: description || "غير متوفر",
            aliases: genres.join(", ") || "غير محدد",
            airdate: airdate || "غير محدد",
        });
    }

    console.log(details);
    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const htmlRegex = /<a\s+[^>]*href="([^"]*?\/episode\/[^"]*?)"[^>]*>[\s\S]*?الحلقة\s+(\d+)[\s\S]*?<\/a>/gi;
    const plainTextRegex = /الحلقة\s+(\d+)/g;

    let matches;

    if ((matches = html.match(htmlRegex))) {
        matches.forEach(link => {
            const hrefMatch = link.match(/href="([^"]+)"/);
            const numberMatch = link.match(/الحلقة\s+(\d+)/);
            if (hrefMatch && numberMatch) {
                const href = hrefMatch[1];
                const number = numberMatch[1];
                episodes.push({
                    href: href,
                    number: number
                });
            }
        });
    } else if ((matches = html.match(plainTextRegex))) {
        matches.forEach(match => {
            const numberMatch = match.match(/\d+/);
            if (numberMatch) {
                episodes.push({
                    href: null,
                    number: numberMatch[0]
                });
            }
        });
    }

    console.log(episodes);
    return episodes;
}

async function extractStreamUrl(html) {
    try {
        const sourceMatch = html.match(/data-video-source="([^"]+)"/);
        let embedUrl = sourceMatch?.[1]?.replace(/&amp;/g, '&');
        if (!embedUrl) return null;

        const cinemaMatch = html.match(/url\.searchParams\.append\(\s*['"]cinema['"]\s*,\s*(\d+)\s*\)/);
        const lastMatch = html.match(/url\.searchParams\.append\(\s*['"]last['"]\s*,\s*(\d+)\s*\)/);
        const cinemaNum = cinemaMatch ? cinemaMatch[1] : undefined;
        const lastNum = lastMatch ? lastMatch[1] : undefined;

        if (cinemaNum) embedUrl += `&cinema=${cinemaNum}`;
        if (lastNum) embedUrl += `&last=${lastNum}`;
        embedUrl += `&next-image=undefined`;

        console.log('Full embed URL:', embedUrl);

        const response = await fetchv2(embedUrl);
        const data = await response.text();
        console.log('Embed page HTML:', data);

        const qualities = extractQualities(data);

        const epMatch = html.match(/<title>[^<]*الحلقة\s*(\d+)[^<]*<\/title>/);
        const currentEp = epMatch ? Number(epMatch[1]) : null;

        let nextEpNum, nextDuration, nextSubtitle;
        if (currentEp !== null) {
            const episodeRegex = new RegExp(
                `<a[^>]+href="[^"]+/episode/[^/]+/(\\d+)"[\\s\\S]*?` +
                `<span[^>]*>([^<]+)<\\/span>[\\s\\S]*?` +
                `<p[^>]*>([^<]+)<\\/p>`,
                'g'
            );
            let m;
            while ((m = episodeRegex.exec(html)) !== null) {
                const num = Number(m[1]);
                if (num > currentEp) {
                    nextEpNum = num;
                    nextDuration = m[2].trim();
                    nextSubtitle = m[3].trim();
                    break;
                }
            }
        }

        if (nextEpNum != null) {
            embedUrl += `&next-title=${encodeURIComponent(nextDuration)}`;
            embedUrl += `&next-sub-title=${encodeURIComponent(nextSubtitle)}`;
        }

        const result = {
            streams: qualities,
        }

        console.log(JSON.stringify(result));
        return JSON.stringify(result);
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
