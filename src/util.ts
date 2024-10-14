export function similarity(s1: string, s2: string) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    let longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(String(longerLength));
}


function editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

export function replaceNonAscii(str: string): string {
    const nonAsciiMap: { [key: string]: string } = {
        '×': 'x',
    };

    let result = '';
    for (let i = 0; i < str.length; i++) {
        if (nonAsciiMap[str[i]]) {
            result += nonAsciiMap[str[i]];
        } else {
            result += str[i];
        }
    }
    return result;
}

export function getTemporadaIfPresent(text: string) {
    let temporada = "";
    for (const line of text.toLowerCase().split("\n")) {
        if (line.includes("temporada") && line.length < 20) {
            const match = line.split("temporada")
            .find(s => s.search(/\d+/))
            ?.match(/\d+/);
            if (match) {
                temporada = match[0];
                break;
            }
        }
    }
    return temporada;
}