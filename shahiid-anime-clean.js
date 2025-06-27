function searchResults(html) {
    const results = [];
    const itemBlocks = html.match(/<div[^>]*class="anime-block"[^>]*>[\s\S]*?<h3>(.*?)<\/h3>[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<img src="([^"]+)"[^>]*>/g);
    if (!itemBlocks) {
        console.error('No anime blocks found in HTML');
        return results;
    }
    itemBlocks.forEach(block => {
        const hrefMatch = block.match(/<a href="([^"]+)"/);
        const titleMatch = block.match(/<h3>(.*?)<\/h3>/);
        const imgMatch = block.match(/<img src="([^"]+)"/);
        if (hrefMatch && titleMatch && imgMatch) {
            const href = hrefMatch[1].trim();
            const title = decodeHTMLEntities(titleMatch[1].trim());
            const image = decodeHTMLEntities(imgMatch[1].trim());
            if (href.startsWith('http')) {
                results.push({ title, image, href });
            }
        }
    });
    console.log('Search Results:', results);
    return results;
}

function extractDetails(html) {
    const descriptionMatch = html.match(/<div[^>]*class="anime-description"[^>]*>(.*?)<\/div>/s) || 
                           html.match(/<p[^>]*>(.*?)<\/p>/s);
    const description = descriptionMatch ? decodeHTMLEntities(descriptionMatch[1].trim()) : 'N/A';
    const durationMatch = html.match(/<li>\s*<span>\s*مدة العرض\s*:\s*<\/span>\s*(\d+)\s*دقيقة/);
    const duration = durationMatch ? durationMatch[1].trim() : 'N/A';
    const airdateMatch = html.match(/<li>\s*<span>\s*تاريخ الاصدار\s*:\s*<\/span>\s*(\d{4})/);
    const airdate = airdateMatch ? airdateMatch[1].trim() : 'N/A';
    const details = { description, duration, airdate };
    console.log('Details:', details);
    return details;
}

function extractEpisodes(html) {
    const episodes = [];
    const episodeRegex = /<a href="([^"]+)"[^>]*>\s*الحلقة\s*(\d+)\s*<\/a>/g;
    let match;
    while ((match = episodeRegex.exec(html)) !== null) {
        const href = match[1].trim();
        const number = match[2].trim();
        if (href.startsWith('http')) {
            episodes.push({ href, number });
        }
    }
    episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
    console.log('Episodes:', episodes);
    return episodes;
}

async function extractStreamUrl(html) {
    const serverMatch = html.match(/<iframe[^>]+src="https:\/\/doodstream\.com\/e\/([^"]+)"/);
    let streamUrl = serverMatch ? `https://doodstream.com/e/${serverMatch[1].trim()}` : 'N/A';
    if (streamUrl !== 'N/A') {
        try {
            const response = await soraFetch(streamUrl);
            if (!response) {
                console.error('Failed to fetch DoodStream URL');
                return 'N/A';
            }
            const fetchedHtml = await response.text();
            const streamMatch = fetchedHtml.match(/src:\s*["']([^"']+\.mp4)["']/i) || 
                              fetchedHtml.match(/src:\s*["']([^"']+\.m3u8)["']/i);
            streamUrl = streamMatch ? streamMatch[1].trim() : 'N/A';
        } catch (error) {
            console.error(`Failed to fetch stream URL: ${error.message}`);
            streamUrl = 'N/A';
        }
    }
    console.log('Stream URL:', streamUrl);
    return streamUrl;
}

function decodeHTMLEntities(text) {
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    const entities = {
        '"': '"',
        '&': '&',
        ''': "'",
        '<': '<',
        '>': '>',
        ' ': ' '
    };
    for (const entity in entities) {
        text = text.replace(new RegExp(entity, 'g'), entities[entity]);
    }
    return text;
}

async function soraFetch(url, options = { headers: {}, method: 'GET', body: null }) {
    try {
        const response = await fetch(url, { 
            headers: options.headers, 
            method: options.method, 
            body: options.body 
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response;
    } catch (error) {
        console.error(`Fetch failed for ${url}: ${error.message}`);
        return null;
    }
}
