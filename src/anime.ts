import axios, { AxiosResponse } from "axios";
import { SearchPageResult, getAllAnimeEpisodesInPage, getResultsPage } from "./parser.js";
import { MyProxy } from "./config.js";
import { SocksProxyAgent } from "socks-proxy-agent";
import { replaceNonAscii, similarity } from "./util.js";

const headers = {
    'authority': 'www.hinatasoul.com',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en;q=0.5',
    'cache-control': 'max-age=0',
    'dnt': '1',
    'sec-ch-ua': '"Brave";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Linux"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
};

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
    private endpoint = "https://www.hinatasoul.com";
    private downloadHost = "https://cdn8.anicdn.net";
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

        let currentPage = 1;
        let animes: SearchPageResult[];
        let mostSimilar: {anime: SearchPageResult, similarity: number} = {
            anime: {},
            similarity: 0
        };
        do {
            const pageUrl = `${this.endpoint}/busca?busca=${anilistResult}&page=${currentPage}`;
            let response: AxiosResponse<any, any>;
            try {
                response = await axios.get(pageUrl, {
                    headers: headers
                });
            } catch(e) {
                process.exit(1);
            }
           
            animes = getResultsPage(response.data);

            for (let anime of animes) {
                const tempSim = similarity(term, anime.name!);
                if (tempSim > mostSimilar.similarity) {
                    mostSimilar = {
                        anime: anime,
                        similarity: tempSim
                    }
                }
            }
            currentPage++;
        } while (animes.length > 0);
        return mostSimilar.anime;
    }

    async downloadAnime(title: string, episode: number) {
        const animeData = await this.searchAnimeSite(title);
        if (animeData.href == undefined) {
            throw new Error("Anime not found!");
        }
        const page = Math.ceil(episode / 24);

        const url = `${animeData.href}/page/${page}`;
        const response = await axios.get(url, {
            headers: headers
        });

        const episodes = await getAllAnimeEpisodesInPage(response.data);
        if (!episodes) {
            throw new NoEpisodesError();
        }
        const selectedEpisode = episodes.find(ep => ep.title.includes(episode.toString()));
        if (!selectedEpisode) {
            throw new EpisodeNotFoundError();
        }
        const qualities = [
            "appsd2",
            "appsd"
        ]
        for (let i = 0; i < 2; i++) {
            try {
                const downloadUrl = `${this.downloadHost}/${qualities[i]}/${selectedEpisode.href.split("/").slice(-1)}.mp4`;
                const downloadResponse = await axios.get(downloadUrl, {
                    headers: {
                        "Accept": "*/*",
                        "Accept-Language": "en;q=0.6",
                        "Connection": "keep-alive",
                        "Referer": "https://www.hinatasoul.com/",
                        "Sec-Fetch-Dest": "video",
                        "Sec-Fetch-Mode": "no-cors",
                        "Sec-Fetch-Site": "cross-site",
                        "Sec-GPC": "1",
                        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                        "dnt": "1",
                        "sec-ch-ua": '"Not/A)Brand";v="99", "Brave";v="115", "Chromium";v="115"',
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": '"Linux"',
                    },
                    responseType: 'arraybuffer'
                });
        
                if (downloadResponse.status == 200) {
                    return {
                        title: animeData.name,
                        data: downloadResponse.data as ArrayBuffer
                    }
                }
            } catch (e: any) {
                if (e.response.status != 404) {
                    console.log(e)
                    throw new Error("Unknown error");
                }
                console.log(e);
                throw new Error("Anime not found");
            }
        }

        throw new Error("Unknown error!");
    }
}
