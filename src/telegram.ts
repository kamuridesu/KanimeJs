import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { TelegramAuth } from "./config.js";
import { readFile, writeFile } from "fs/promises";
import { getTemporadaIfPresent, similarity } from "./util.js";

type Episode = {
    name: string;
    id: number;
}


type FileTree = {
    title: string;
    episodes: Episode[];
}

const NAMES = [
    "**Nome**:",
    "**Anime**:",
    "Nome:",
    "Anime:",
    "**Anime:**",
    "**Nome:**",
    "◈Nome:",
    "**Anim**e:",
    "Filme:",
    "**Filme**:",
    "**Filme:** ",
    "✦Nome:",
    "**None**:",
    "**None:** ",
    "None:",
    "❝",
]

export class Telegram {
    client = new TelegramClient(new StringSession(TelegramAuth.stringSession!), TelegramAuth.apiId, TelegramAuth.apiHash, { connectionRetries: 5 });

    animes: FileTree[] = [];

    async init() {
        await this.client.connect();
        return this;
    }

    async save() {
        await writeFile("files.json", JSON.stringify(this.animes, undefined, 4));
    }

    async buildFileTree() {
        const messages = await this.client.getMessages(TelegramAuth.chatId, { reverse: true, limit: undefined });
        let animeInfo: FileTree = { "title": "", episodes: [] }
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            let isTitleFound = false;

            for (const name of NAMES) {

                if (message.text.includes(name.trim())) {
                    const text = message.text.trim();
                    const uTitle = text.split("\n").filter(s => s != "").filter(s => s.trim().startsWith(name.trim()));
                    if (uTitle.length < 1) continue;
                    const title = uTitle[0].split(name)[1].trim() + getTemporadaIfPresent(message.text);
                    console.log("Title: " + title);
                    animeInfo["title"] = title;
                    isTitleFound = true;
                    break;
                }
            }

            if (isTitleFound) continue;

            else if (message.media != undefined 
                && message.sticker != undefined
                && (messages[i + 1] == undefined
                || messages[i + 1].text.trim().split("\n").length > 3)) {
                this.animes.push(animeInfo);
                animeInfo = { "title": "", episodes: [] }
                continue;
            }
            else if (message.media && message.sticker == undefined) {
                if (message.photo) {
                    animeInfo["title"] = message.text.split("\n")[0].trim()
                    + getTemporadaIfPresent(message.text);
                    continue;
                }
                animeInfo["episodes"].push({
                    id: message.id,
                    name: message.text.split("\n")[0]
                });
                continue;
            }
        }
    }

    async loadExistingFileTree(): Promise<FileTree[]> {
        const animes = JSON.parse((await readFile("files.json")).toString());
        this.animes = animes;
        return animes;
    }

    searchAnime(title: string) {
        if (this.animes.length < 1) throw new Error("Anime list is empty!");

        const matches = [];
        for (const anime of this.animes) {
            if (similarity(anime.title, title) > 0.5) {
                matches.push(anime);
            }
        }
        return matches;
    }

    async download(fileId: number) {
        const messages = await this.client.getMessages(TelegramAuth.chatId, {ids: [fileId]});
        if (messages == undefined || messages.length < 1) throw new Error("Message not found");
        const message = messages[0];
        const data = await this.client.downloadMedia(message, {progressCallback: console.log});
        if (data) {
            return data;
        }
        throw new Error("Could not download media.");
    }

    async close() {
        await this.client.disconnect();
        await this.client.destroy();
    }
}
