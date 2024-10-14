import { existsSync, readFileSync } from "fs";

function loadDotEnv() {
    if (!existsSync(".env")) return;
    const content = readFileSync(".env").toString();
    for (const line of content.split("\n")) {
        if (line.startsWith("#")) continue;
        const data = line.split("=");
        const key = data[0].trim();
        let value = data.slice(1).join("=").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}

loadDotEnv();

type ProxyAuth = {
    username: string;
    password: string;
}

type CustomProxy = {
    protocol: string;
    host: string;
    port: number;
    auth: ProxyAuth;
}

export const MyProxy: CustomProxy = {
    protocol: 'socks5',
    host: process.env.PROXY_HOST!,
    port: parseFloat(process.env.PROXY_PORT!),
    auth: {
      username: process.env.PROXY_USER!,
      password: process.env.PROXY_PASS!
    }
}


type TelegramAuthInfo = {
    apiId: number;
    apiHash: string;
    stringSession?: string;
    chatId: string;
}

export const TelegramAuth: TelegramAuthInfo = {
    apiId: parseInt(process.env.API_ID ? process.env.API_ID : "0"),
    apiHash: process.env.API_HASH ? process.env.API_HASH : "",
    stringSession: process.env.STRING_SESSION ? process.env.STRING_SESSION : "",
    chatId: process.env.CHAT_ID ? process.env.CHAT_ID : "",
}
