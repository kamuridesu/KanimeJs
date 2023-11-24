import { Anime } from "./src/anime.js";

import * as fs from "fs";

(async () => {
    // const data = await new Anime().downloadAnime("serial-experiments-lain", 1);
    // fs.writeFileSync("test.mp4", data as any);
    const results = await new Anime().searchAnimeSite("jujutsu 2");
})();
