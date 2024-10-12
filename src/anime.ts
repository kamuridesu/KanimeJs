import axios, { AxiosResponse } from "axios";
import { MyProxy } from "./config.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import { replaceNonAscii, similarity } from "./util.js";

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

class EpisodeNotFoundError extends Error {
    constructor(message: string = "Episode not found!") {
        super(message);
    }
}

class NoEpisodesError extends Error {
    constructor(message: string = "No episodes found!") {
        super(message);
    }
}

export class Anime {
    private searchEndpoint = 'https://graphql.anilist.co'

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
        return response.data.data.anime.results as AnimeSearchResponse[];
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

    async searchAnimeSite(term: string) {
        const anilistResultArray = (await this.search(term));
        let anilistResult = replaceNonAscii(this.sortMostPopular(anilistResultArray).title.userPreferred);

        
    }

    async downloadAnime(title: string, episode: number) {

    }
}
