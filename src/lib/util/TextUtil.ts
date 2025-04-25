export class TextUtil {
    static areEastAsianCharactersOverThreashold(text: string, threshold = 0.5) {
        if (!text || text.length === 0) return true;
        // Regular expression to match common East Asian scripts
        const eastAsianRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef\u3130-\u318f\uac00-\ud7af]/g;
        const eastAsianMatches = text.match(eastAsianRegex) || []; 
        const eastAsianPercentage = eastAsianMatches.length / text.length;
        return eastAsianPercentage <= threshold;
    }
}
