defineModule({
  id: 'topcinema',
  name: 'TopCinema',
  version: '1.0.0',
  icon: 'https://web6.topcinema.cam/favicon.ico',

  async searchResults({ query }) {
    const resp = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=653bb8af90162bd98fc7ee32bcbbfb3d&query=${encodeURIComponent(query)}`
    );
    const data = await resp.json();
    return data.results.map(item => ({
      title: item.title || item.name || 'No Title',
      image: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
      href: `topcinema://${item.media_type}/${item.id}`
    }));
  },

  async fetchDetails({ url }) {
    const [, type, id] = url.match(/topcinema:\/\/(movie|tv)\/(\d+)/);
    const apiUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`;
    const data = await (await fetch(apiUrl)).json();
    return {
      description: data.overview || 'No description available',
      metadata: [
        { label: 'Release Date', value: data.release_date || data.first_air_date || 'Unknown' },
        { label: 'Runtime', value: ((data.runtime || data.episode_run_time?.[0]) + ' min') || 'Unknown' }
      ]
    };
  },

  async fetchEpisodes({ url }) {
    const [, , id] = url.match(/topcinema:\/\/(movie|tv)\/(\d+)/);
    const showData = await (await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`)).json();
    const episodes = [];
    for (const s of showData.seasons || []) {
      if (s.season_number === 0) continue;
      const sd = await (await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${s.season_number}?api_key=653bb8af90162bd98fc7ee32bcbbfb3d`)).json();
      sd.episodes.forEach(ep => {
        episodes.push({
          title: ep.name || `Episode ${ep.episode_number}`,
          number: ep.episode_number,
          season: s.season_number,
          href: `topcinema://tv/${id}/season/${s.season_number}/episode/${ep.episode_number}`
        });
      });
    }
    return episodes;
  },

  async extractStream({ url }) {
    const m = url.match(/topcinema:\/\/(movie|tv)\/(\d+)(?:\/season\/(\d+)\/episode\/(\d+))?/);
    if (!m) return null;
    const [, type, id, season, episode] = m;
    const pageUrl = (type === 'movie')
      ? `https://web6.topcinema.cam/?p=${id}`
      : `https://web6.topcinema.cam/?p=${id}&season=${season}&episode=${episode}`;
    const html = await (await fetch(pageUrl)).text();

    const match = html.match(/<iframe[^>]+src="([^"]+\/embed\/[^"]+)"/);
    if (!match) throw new Error('No embed iframe found');
    let src = match[1];
    if (!src.startsWith('http')) src = 'https:' + src;

    return { stream: src };
  }
});
