import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { TelegramAuth } from "./config.js";
import { writeFileSync } from "fs";


type FileTree = {
    title: string;
    episodes_ids: number[];
}

const NAMES = [
    "**Nome**: ",
    "**Anime**: ",
    "Nome: ",
    "Anime: ",
    "**Anime:**",
    "**Nome:**"
]

export class Telegram {
    client = new TelegramClient(new StringSession(TelegramAuth.stringSession!), TelegramAuth.apiId, TelegramAuth.apiHash, { connectionRetries: 5 });

    async init() {
        await this.client.connect();
        return this;
    }

    saveJson(data: FileTree[]) {
        writeFileSync("files.json", JSON.stringify(data, undefined, 4));
    }

    async buildFileTree() {
        const allAnimes: FileTree[] = [];
        const messages = await this.client.getMessages(TelegramAuth.chatId, { reverse: true, limit: 4000 });
        let animeInfo: FileTree = { "title": "", episodes_ids: [] }
        for (const message of messages) {

            for (const name of NAMES) {
                if (message.text.includes(name.trim())) {
                    const text = message.text.trim();
                    console.log(text.split("\n"));
                    console.log(text.split("\n")[0].split(name));
                    
                    const uTitle = text.split("\n").filter(s => s != "").filter(s => s.includes(name));
                    console.log(uTitle);
                    if (!uTitle) throw new Error("Title not parsed");
                    const title = uTitle[0].split(name)[1].trim();
                    console.log("Title: " + title);
                    animeInfo["title"] = title;
                    break;
                }
            }

            if (message.media != undefined && message.sticker != undefined) {
                allAnimes.push(animeInfo);
                this.saveJson(allAnimes);
                animeInfo = { "title": "", episodes_ids: [] }
                continue;
            }
            if (message.media) {
                animeInfo["episodes_ids"].push(message.id);
                continue;
            }

        }
        await this.client.disconnect();
    }
}
