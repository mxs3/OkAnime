defineModule({
  name: 'Anime Blkom',
  version: '1.0.0',
  icon: 'https://blkom.com/favicon.ico',
  async load({ url }) {
    const res = await fetch(url);
    const html = await res.text();
    const match = html.match(/<source\s+src="([^"]+\.mp4)"/i);
    if (!match) throw new Error('No video found.');
    return {
      stream: {
        url: match[1],
        type: 'mp4',
        headers: { Referer: 'https://blkom.com' }
      }
    };
  }
});
