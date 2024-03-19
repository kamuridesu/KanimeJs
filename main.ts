import { Anime } from "./src/anime.js";

import * as fs from "fs";

(async () => {
    const data = await new Anime().downloadAnime("frieren", 1);
    fs.writeFileSync(data.title + ".mp4", data.data as any);
    // const results = await new Anime().searchAnimeSite("kiss x sis");
    // console.log(results)
})();
