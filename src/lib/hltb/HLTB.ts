import { got } from 'got';
import { JSDOM } from 'jsdom';

export class HLTB {
    static async getGameDuration(gameId: string): Promise<number> {
        const response = await got(`https://howlongtobeat.com/game?id=${gameId}`);
        const dom = new JSDOM(response.body);
        try {
            const timeTable = dom.window.document.querySelector('[class^=GameTimeTable_game_main_table]');
            const durationText = timeTable?.children[1].children[1].children[2].textContent;
            if (!durationText) {
                return 0;
            }
            let duration = 0;
            const durationSplit = durationText.split(/\s+/);
            durationSplit.forEach(part => {
                if (part.endsWith('h')) {
                    duration += parseInt(part.replace('h', '')) * 3600;
                } else if (part.endsWith('m')) {
                    duration += parseInt(part.replace('m', '')) * 60;
                } else if (part.endsWith('s')) {
                    duration += parseInt(part.replace('s', ''));
                }
            });
            return duration;
        } catch (e) {
            console.error(e);
            return 0;
        }
    }
}
