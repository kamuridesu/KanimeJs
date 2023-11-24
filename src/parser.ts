import { parse } from 'node-html-parser';

interface AnimeEpisodes {
    href: string;
    title: string;
}

export async function getAllAnimeEpisodesInPage(page: string) {
    return parse(page).getElementsByTagName("div")
        .find(div => div.attributes.class == "aniContainer")?.childNodes
        .filter(e => e.childNodes.length > 0)
        .map(child => {
            return child.childNodes
                .filter(e => e.childNodes.length > 0)
                .map(e => {
                    return e.childNodes[0].parentNode.rawAttributes;
                })[0] as unknown as AnimeEpisodes;
        });
}

export interface SearchPageResult {
    name?: string;
    href?: string;
}

export function getResultsPage(document: string): SearchPageResult[] {
    return parse(document).querySelectorAll('.aniContainer .ultimosAnimesHomeItem').map(item => {
        return {
            name: item.querySelector('.ultimosAnimesHomeItemInfosNome')?.innerText.trim(),
            href: item.querySelector('a')?.getAttribute('href')
        }
    });
}
