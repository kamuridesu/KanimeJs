import axios, { AxiosResponse } from "axios";
import { MyProxy } from "./config.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import { replaceNonAscii, similarity } from "./util.js";
import { Telegram } from "./telegram.js";

interface AnimeSearchResponse {
    id: number;
    title: {
        userPreferred: string;
    };
    coverImage: {
        medium: string;
    };
    type: string;
    format: string;
    bannerImage: string;
    isLicensed: boolean;
    popularity: number;
    startDate: {
        year: number;
    };
}

type AnimeDownloadInfo = {
    title: string;
    data: string | Buffer;
    number: number;
}

class EpisodeNotFoundError extends Error {
    constructor(message: string = "Episode not found!") {
        super(message);
    }
}

export class Anime {
    private searchEndpoint = 'https://graphql.anilist.co'
    private tgClient: Telegram;

    constructor(tg: Telegram) {
        this.tgClient = tg;
    }

    async init() {
        await this.tgClient.init();
        await this.tgClient.loadExistingFileTree();
        return this;
    }

    async close() {
        await this.tgClient.close();
    }

    async search(term: string) {
        const proxy = process.env.PROXY_HOST != undefined ? MyProxy : false;
        let agent;
        if (proxy) {
            const proxyUrl = `${proxy.protocol}://${proxy.auth.username}:${proxy.auth.password}@${proxy.host}:${proxy.port}`;
            agent = new SocksProxyAgent(proxyUrl);
        }
        const response = await axios.post(
            this.searchEndpoint,
            {
                query: `query ($search: String, $isAdult: Boolean) {
                anime: Page(perPage: 10) {
                  pageInfo {
                    total
                  }
                  results: media(type: ANIME, isAdult: $isAdult, search: $search) {
                    id
                    title {
                      userPreferred
                    }
                    coverImage {
                      medium
                    }
                    type
                    format
                    bannerImage
                    isLicensed
                    popularity
                    startDate {
                      year
                    }
                  }
                }
              }`,
                variables: {
                    'search': term
                },
                
            },
            {
                headers: {
                    'Accept': '*/*',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Content-Type': 'application/json',
                    'schema': 'default',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'DNT': '1',
                    'TE': 'trailers'
                },
                httpsAgent: agent
            },

        );
        const data: AnimeSearchResponse[] = response.data.data.anime.results;
        return replaceNonAscii(this.sortMostPopular(data).title.userPreferred);
    }

    sortMostPopular(anilistResultArray: AnimeSearchResponse[]) {
        let mostPopular: AnimeSearchResponse = anilistResultArray[0];
        for (let anime of anilistResultArray) {
            if (anime.popularity > mostPopular.popularity) {
                mostPopular = anime;
            }
        }
        return mostPopular;
    }

    async searchAnime(term: string) {
        const anilistResult = (await this.search(term));
        const telegramResults = this.tgClient.animes;

        let mostSimilar = telegramResults[0];
        let maxSimilarity = 0;
        for (const anime of telegramResults) {
            const sim = similarity(anime.title, anilistResult);
            if (sim > maxSimilarity) {
                mostSimilar = anime;
                maxSimilarity = sim
            }
        }
        return mostSimilar;
    }

    async download(title: string, episode: number): Promise<AnimeDownloadInfo> {
        const actualEpisode = episode - 1;
        const anime = await this.searchAnime(title);
        if (actualEpisode > anime.episodes.length) throw new EpisodeNotFoundError();
        const selectedEpisode = anime.episodes[actualEpisode];
        if (selectedEpisode == undefined) throw new EpisodeNotFoundError();
        const data = await this.tgClient.download(selectedEpisode.id);
        return {
            title: selectedEpisode.name,
            data: data,
            number: episode + 1
        }
    }
}
