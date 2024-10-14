import { Telegram } from "./src/telegram.js";
import { Anime } from "./src/anime.js";

import * as fs from "fs";

(async () => {
    const anime = await new Anime(new Telegram()).init();
    const data = await anime.download("frieren", 1);
    fs.writeFileSync(data.title + ".mp4", data.data);
    await anime.close();
})();
