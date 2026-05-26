
import { GoogleGenAI } from "@google/genai";
import { MatchResult, GameData, Message, PlayerRole } from './types';
import { INITIAL_SPONSORSHIPS } from './data';

const GEMINI_MODEL = 'gemini-3-flash-preview';

let ai: GoogleGenAI;

function getAi() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
}

const getSystemInstruction = (gameData: GameData) => {
    const userTeam = gameData.teams.find(t => t.id === gameData.userTeamId);
    const currentFormat = gameData.currentFormat;
    const teamList = gameData.teams.map(t => t.name).join(', ');

    return `
    You are "Signify", an expert AI cricket manager assistant for '${userTeam?.name}'.
    
    **League Rules You Must Enforce & Advise On:**
    1. **Squad Composition:** Teams can only have 2 foreign players in their entire squad.
    2. **Playing XI:** Only 1 foreign player is allowed in the starting XI for any match.
    3. **Season Transition:** At the end of each season, managers can retain up to 5 players. Retaining a player costs their market value + a 1 Crore premium. 
    4. **Tactics:** Advise the user on whether a player is worth the 1 Cr retention premium based on their career stats.
    
    **Current Context:**
    - Season: ${gameData.currentSeason} | Format: ${currentFormat}
    - Squad Size: ${userTeam?.squad.length}
    - Foreign Players in Squad: ${userTeam?.squad.filter(p => p.isForeign).length}
    
    **Guidelines:**
    - Always refer to yourself as "Signify".
    - Be analytical. If the user has 2 foreign players, warn them they cannot sign more.
    - If a user asks who to retain, look for high-skill players (85+) who justify the 1 Cr extra cost.
    `;
};

export async function* streamAssistantResponse(
    prompt: string,
    history: Message[],
    gameData: GameData
): AsyncGenerator<string> {
    const ai = getAi();
    const systemInstruction = getSystemInstruction(gameData);
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    try {
        const result = await ai.models.generateContentStream({
            model: GEMINI_MODEL,
            contents,
            config: { systemInstruction }
        });
        for await (const chunk of result) {
            if (chunk.text) yield chunk.text;
        }
    } catch (e) {
        yield "I'm having trouble connecting to the strategy room. Please check your connection.";
    }
}

export const generateMatchAnalysis = async (matchResult: MatchResult): Promise<string> => {
    const ai = getAi();
    const prompt = `Analyze this cricket match scorecard. Highlight turning points and MOTM impact.
    Summary: ${matchResult.summary}
    Man of Match: ${matchResult.manOfTheMatch.playerName}`;

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "Analysis unavailable.";
    } catch (e) {
        return "Could not generate analysis at this time.";
    }
};
