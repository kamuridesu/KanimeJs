import { Telegram } from "./src/telegram.js";
import { Anime } from "./src/anime.js";

import { similarity } from "./src/util.js";

import * as fs from "fs";

(async () => {
    const tg = await new Telegram().init();
    await tg.buildFileTree();
    // const data = await new Anime().downloadAnime("frieren", 1);
    // fs.writeFileSync(data.title + ".mp4", data.data as any);
    // // const results = await new Anime().searchAnimeSite("kiss x sis");
    // // console.log(results)
})();


// console.log(similarity("kamuri", "kamuri"))