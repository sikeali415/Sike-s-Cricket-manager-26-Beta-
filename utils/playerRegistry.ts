
import { Player, PlayerRole, BattingStyle, BowlingSubType, Format, PlayerStats } from '../types';

const generateSingleFormatInitialStats = (): PlayerStats => {
    const phaseStats = {
        batting: {
            pp: { runs: 0, balls: 0, dismissals: 0 },
            mo: { runs: 0, balls: 0, dismissals: 0 },
            do: { runs: 0, balls: 0, dismissals: 0 }
        },
        bowling: {
            pp: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            mo: { wickets: 0, runsConceded: 0, ballsBowled: 0 },
            do: { wickets: 0, runsConceded: 0, ballsBowled: 0 }
        }
    };

    const positionStats: Record<number, { innings: number; runs: number; balls: number; dismissals: number; thirties: number; fifties: number; hundreds: number }> = {};
    for (let pos = 1; pos <= 11; pos++) {
        positionStats[pos] = { innings: 0, runs: 0, balls: 0, dismissals: 0, thirties: 0, fifties: 0, hundreds: 0 };
    }

    return {
        matches: 0, 
        inningsBatting: 0,
        inningsBowling: 0,
        runs: 0, highestScore: 0, average: 0, strikeRate: 0, ballsFaced: 0, dismissals: 0,
        hundreds: 0, fifties: 0, thirties: 0, fours: 0, sixes: 0, fastestFifty: 0, fastestHundred: 0,
        wickets: 0, economy: 0, bestBowling: '-', bestBowlingWickets: 0, bestBowlingRuns: 0,
        bowlingAverage: 0, ballsBowled: 0, runsConceded: 0, threeWicketHauls: 0, fiveWicketHauls: 0,
        catches: 0, runOuts: 0, manOfTheMatchAwards: 0,
        phaseStats,
        positionStats
    };
};

const generateInitialStats = (): { [key in Format]: PlayerStats } => {
    const stats: any = {};
    Object.values(Format).forEach(f => stats[f] = generateSingleFormatInitialStats());
    return stats;
};

interface RawPlayerData {
    id: string;
    name: string;
    age: number;
    nationality: string;
    role: string;
    batting: number;
    bowling: number;
    style: string;
    isForeign: boolean;
    pos?: string;
    weakness?: string;
    traits?: string[];
}

const bowlingTypeMap: Record<string, BowlingSubType> = {
    'ls': 'ls', 'os': 'os', 'lals': 'lals', 'laos': 'laos', 'lac': 'lac',
    'mv': 'mv', 'fb': 'fb', 'fbs': 'fbs', 'm': 'm'
};

const roleMap: Record<string, PlayerRole> = {
    'AR': PlayerRole.ALL_ROUNDER,
    'WK': PlayerRole.WICKET_KEEPER,
    'BL': PlayerRole.FAST_BOWLER, // Default BL to Fast, modified later if SB
    'SB': PlayerRole.SPIN_BOWLER,
    'BT': PlayerRole.BATSMAN
};

const styleMap: Record<string, BattingStyle> = {
    'A': 'A', 'D': 'D', 'N': 'N', 'NA': 'NA'
};

export const parseRawData = (data: RawPlayerData[]): Player[] => {
    return data.map(p => {
        const role = roleMap[p.role] || PlayerRole.BATSMAN;
        const style = (styleMap[p.style] || 'N') as BattingStyle;
        const weaknesses = p.weakness ? p.weakness.split('&').map(s => bowlingTypeMap[s.trim()] || 'none').filter(s => s !== 'none') as BowlingSubType[] : undefined;
        
        let subType: BowlingSubType | undefined = undefined;
        if (p.traits) {
            const foundType = p.traits.find(t => bowlingTypeMap[t]);
            if (foundType) subType = bowlingTypeMap[foundType];
        }
        // Check if role was SB but mapping said BL
        const finalRole = p.role === 'SB' ? PlayerRole.SPIN_BOWLER : role;

        return {
            id: p.id,
            name: p.name,
            age: p.age,
            nationality: p.nationality,
            role: finalRole,
            battingSkill: p.batting,
            secondarySkill: p.bowling,
            style: style,
            isOpener: p.pos?.includes('OP') || false,
            isForeign: p.isForeign,
            isFinisher: p.pos?.includes('Finisher') || p.traits?.includes('Finisher'),
            isPowerHitter: p.traits?.includes('Power Hitter'),
            traits: p.traits,
            bowlingSubType: subType,
            weaknesses: weaknesses,
            stats: generateInitialStats(),
        };
    });
};

export const RAW_DATA_INTERNATIONAL: RawPlayerData[] = [
    { id: 'int-au-1', name: 'Chemar Greaves', age: 26, nationality: 'West Indies', role: 'AR', batting: 70, bowling: 65, style: 'A', isForeign: true, pos: 'Finisher', traits: ['Workload Fatigue'] },
    { id: 'int-au-2', name: 'Pankaj Mishra', age: 27, nationality: 'India', role: 'SB', batting: 12, bowling: 75, style: 'N', isForeign: true, traits: ['Dew Liability'], weakness: 'ls' },
    { id: 'int-au-3', name: 'Arjun Malhotra', age: 27, nationality: 'India', role: 'BT', batting: 78, bowling: 0, style: 'A', isForeign: true, pos: 'OP', traits: ['Powerplay Enforcer'] },
    { id: 'int-au-4', name: 'Jan Steenkamp', age: 29, nationality: 'South Africa', role: 'BL', batting: 12, bowling: 85, style: 'N', isForeign: true, traits: ['Enforcer Bouncer'], weakness: 'fbs' },
    { id: 'int-au-5', name: 'Chris Jordan-Wells', age: 33, nationality: 'England', role: 'BL', batting: 10, bowling: 88, style: 'N', isForeign: true, traits: ['The Glass Cannon'], weakness: 'fb' },
    { id: 'int-au-6', name: 'Arjun Malhotra', age: 27, nationality: 'India', role: 'BT', batting: 78, bowling: 0, style: 'A', isForeign: true, pos: 'OP', traits: ['Powerplay Enforcer'] },
    { id: 'int-au-7', name: 'Akash Thakur', age: 26, nationality: 'India', role: 'BL', batting: 15, bowling: 80, style: 'N', isForeign: true, traits: ['Powerplay Specialist'], weakness: 'mv' },
    { id: 'int-au-8', name: 'Sam Callaway', age: 25, nationality: 'England', role: 'AR', batting: 62, bowling: 66, style: 'N', isForeign: true, traits: ['Matchup Dependent'] },
    { id: 'int-au-10', name: 'Asela Jayasundera', age: 32, nationality: 'Sri Lanka', role: 'SB', batting: 18, bowling: 75, style: 'D', isForeign: true, traits: ['Subcontinent Squeeze'], weakness: 'ls' },
    { id: 'int-nz-4', name: 'Quinton du Plooy', age: 30, nationality: 'South Africa', role: 'BT', batting: 76, bowling: 0, style: 'D', isForeign: true, pos: 'OP', traits: ['Pace-Off Blindspot'] },
    { id: 'int-nz-5', name: 'Liam Hendricks', age: 28, nationality: 'South Africa', role: 'SB', batting: 15, bowling: 75, style: 'N', isForeign: true, traits: ['Volatile Wickets'], weakness: 'os' },
    { id: 'int-wi-1', name: 'Romario Beckles', age: 28, nationality: 'West Indies', role: 'BT', batting: 78, bowling: 0, style: 'A', isForeign: true, pos: 'Finisher', traits: ['Spin Slasher'] },
    { id: 'int-wi-3', name: 'Romario Beckles', age: 28, nationality: 'West Indies', role: 'BT', batting: 78, bowling: 0, style: 'A', isForeign: true, pos: 'Finisher', traits: ['Spin Slasher'] },
    { id: 'int-sl-1', name: 'Dinesh Samarawickrama', age: 29, nationality: 'Sri Lanka', role: 'WK', batting: 70, bowling: 5, style: 'N', isForeign: true, traits: ['Middle-Order Engine'] },
    { id: 'int-sl-2', name: 'Hashan Ranatunga', age: 31, nationality: 'Sri Lanka', role: 'AR', batting: 68, bowling: 62, style: 'A', isForeign: true, traits: ['Pinch Hitter'] },
    { id: 'int-sa-1', name: 'Quinton du Plooy', age: 30, nationality: 'South Africa', role: 'BT', batting: 76, bowling: 0, style: 'D', isForeign: true, pos: 'OP', traits: ['Pace-Off Blindspot'] },
    { id: 'int-en-1', name: 'Jonny Vance', age: 29, nationality: 'England', role: 'BT', batting: 78, bowling: 0, style: 'D', isForeign: true, traits: ['Anchor Lockdown'] },
    { id: 'int-en-2', name: 'Jonny Vance', age: 29, nationality: 'England', role: 'BT', batting: 78, bowling: 0, style: 'D', isForeign: true, traits: ['Anchor Lockdown'] },
];

export const RAW_DATA_SPINNERS: RawPlayerData[] = [
    { id: 'sb-1', name: 'Rahat', age: 24, nationality: 'Local', role: 'SB', batting: 12, bowling: 59, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-2', name: 'Abrar', age: 26, nationality: 'Local', role: 'SB', batting: 22, bowling: 62, style: 'D', isForeign: false, traits: ['os'] },
    { id: 'sb-3', name: 'Anwar', age: 26, nationality: 'Local', role: 'SB', batting: 28, bowling: 81, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-4', name: 'Arshad', age: 28, nationality: 'Local', role: 'SB', batting: 22, bowling: 56, style: 'D', isForeign: false, traits: ['ls'] },
    { id: 'sb-5', name: 'Mehrab', age: 22, nationality: 'Local', role: 'SB', batting: 16, bowling: 62, style: 'D', isForeign: false, traits: ['lals'] },
    { id: 'sb-6', name: 'Bilal', age: 21, nationality: 'Local', role: 'SB', batting: 40, bowling: 78, style: 'N', isForeign: false },
    { id: 'sb-7', name: 'Adnan', age: 28, nationality: 'Local', role: 'SB', batting: 12, bowling: 56, style: 'D', isForeign: false, traits: ['laos'] },
    { id: 'sb-8', name: 'Riaz', age: 22, nationality: 'Local', role: 'SB', batting: 11, bowling: 55, style: 'N', isForeign: false, traits: ['lac'] },
    { id: 'sb-9', name: 'Amjad', age: 22, nationality: 'Local', role: 'SB', batting: 30, bowling: 69, style: 'D', isForeign: false, traits: ['os'] },
    { id: 'sb-10', name: 'Rehan', age: 22, nationality: 'Local', role: 'SB', batting: 12, bowling: 61, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-11', name: 'N. Samad', age: 26, nationality: 'Local', role: 'SB', batting: 23, bowling: 55, style: 'D', isForeign: false, traits: ['lac'] },
    { id: 'sb-12', name: 'M. Amjad', age: 30, nationality: 'Local', role: 'SB', batting: 45, bowling: 68, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'sb-13', name: 'Asim', age: 22, nationality: 'Local', role: 'SB', batting: 23, bowling: 71, style: 'D', isForeign: false, traits: ['os'] },
    { id: 'sb-14', name: 'Imtiaz Baloch', age: 26, nationality: 'Local', role: 'SB', batting: 48, bowling: 58, style: 'D', isForeign: false, traits: ['Dew Liability'], weakness: 'ls' },
    { id: 'sb-15', name: 'Nadeem Arif', age: 29, nationality: 'Local', role: 'SB', batting: 51, bowling: 58, style: 'N', isForeign: false, traits: ['Left-Hander Deficit'], weakness: 'os' },
    { id: 'sb-16', name: 'Younis Qadir', age: 24, nationality: 'Local', role: 'SB', batting: 49, bowling: 57, style: 'N', isForeign: false, traits: ['Middle Phase Only'], weakness: 'lals' },
    { id: 'sb-17', name: 'Tauseef Hussain', age: 28, nationality: 'Local', role: 'SB', batting: 53, bowling: 56, style: 'D', isForeign: false, traits: ['Flat Trajectory'], weakness: 'laos' },
];

export const RAW_DATA_ALLROUNDERS: RawPlayerData[] = [
    { id: 'ar-1', name: 'Khalid', age: 25, nationality: 'Local', role: 'AR', batting: 54, bowling: 45, style: 'N', isForeign: false, traits: ['lals'] },
    { id: 'ar-2', name: 'Taimoor', age: 25, nationality: 'Local', role: 'AR', batting: 56, bowling: 51, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-3', name: 'Saeed', age: 27, nationality: 'Local', role: 'AR', batting: 60, bowling: 58, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-4', name: 'Najaf', age: 35, nationality: 'Local', role: 'AR', batting: 41, bowling: 63, style: 'D', isForeign: false, traits: ['ls'] },
    { id: 'ar-5', name: 'Jahangir', age: 36, nationality: 'Local', role: 'AR', batting: 60, bowling: 58, style: 'D', isForeign: false, pos: 'Finisher', traits: ['os'] },
    { id: 'ar-6', name: 'M. Asghar', age: 24, nationality: 'Local', role: 'AR', batting: 56, bowling: 55, style: 'N', isForeign: false, pos: 'Finisher', traits: ['m'] },
    { id: 'ar-7', name: 'Amir', age: 37, nationality: 'Local', role: 'AR', batting: 81, bowling: 85, style: 'NA', isForeign: false, traits: ['ls'] },
    { id: 'ar-8', name: 'Mansoor', age: 23, nationality: 'Local', role: 'AR', batting: 55, bowling: 65, style: 'N', isForeign: false, traits: ['ls'] },
    { id: 'ar-9', name: 'Aftab', age: 26, nationality: 'Local', role: 'AR', batting: 70, bowling: 61, style: 'NA', isForeign: false, pos: 'OP', traits: ['os'] },
    { id: 'ar-10', name: 'Wahab', age: 35, nationality: 'Local', role: 'AR', batting: 50, bowling: 51, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-11', name: 'Aaqib Raza', age: 25, nationality: 'Local', role: 'AR', batting: 78, bowling: 70, style: 'A', isForeign: false, traits: ['fb'] },
    { id: 'ar-12', name: 'Sike', age: 25, nationality: 'Local', role: 'AR', batting: 87, bowling: 85, style: 'NA', isForeign: false, pos: 'OP', traits: ['fbs'] },
    { id: 'ar-13', name: 'Nawaz', age: 23, nationality: 'Local', role: 'AR', batting: 57, bowling: 67, style: 'A', isForeign: false, traits: ['mv'] },
    { id: 'ar-14', name: 'Muhammad Tahir', age: 29, nationality: 'Local', role: 'AR', batting: 60, bowling: 56, style: 'A', isForeign: false, traits: ['m'] },
    { id: 'ar-15', name: 'Irfaan Ali', age: 28, nationality: 'Local', role: 'AR', batting: 70, bowling: 56, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'ar-16', name: 'Junaid Hanif', age: 27, nationality: 'Local', role: 'AR', batting: 59, bowling: 55, style: 'N', isForeign: false, traits: ['Stamina Drain'] },
    { id: 'ar-17', name: 'Mubashir Khan', age: 24, nationality: 'Local', role: 'AR', batting: 58, bowling: 56, style: 'A', isForeign: false, traits: ['Pace Blitz Weakness'] },
    { id: 'ar-18', name: 'Adeel Farooq', age: 28, nationality: 'Local', role: 'AR', batting: 55, bowling: 58, style: 'D', isForeign: false, traits: ['Strictly No. 7'] },
    { id: 'ar-19', name: 'Umer Shahzad', age: 25, nationality: 'Local', role: 'AR', batting: 57, bowling: 54, style: 'N', isForeign: false, traits: ['Condition Dependent'] },
];

export const RAW_DATA_WK: RawPlayerData[] = [
    { id: 'wk-1', name: 'M. Imran', age: 24, nationality: 'Local', role: 'WK', batting: 68, bowling: 60, style: 'A', isForeign: false },
    { id: 'wk-2', name: 'S. Khan', age: 24, nationality: 'Local', role: 'WK', batting: 75, bowling: 87, style: 'D', isForeign: false, pos: 'OP' },
    { id: 'wk-3', name: 'Ali', age: 24, nationality: 'Local', role: 'WK', batting: 60, bowling: 67, style: 'D', isForeign: false },
    { id: 'wk-4', name: 'A. Sajjad', age: 34, nationality: 'Local', role: 'WK', batting: 55, bowling: 69, style: 'N', isForeign: false },
    { id: 'wk-5', name: 'Zulqarnain', age: 24, nationality: 'Local', role: 'WK', batting: 70, bowling: 78, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-6', name: 'Haseebullah', age: 21, nationality: 'Local', role: 'WK', batting: 72, bowling: 78, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-7', name: 'Shahid Latif', age: 31, nationality: 'Local', role: 'WK', batting: 59, bowling: 67, style: 'N', isForeign: false },
    { id: 'wk-8', name: 'Yaqoob', age: 22, nationality: 'Local', role: 'WK', batting: 63, bowling: 68, style: 'D', isForeign: false },
    { id: 'wk-9', name: 'I. Javed', age: 22, nationality: 'Local', role: 'WK', batting: 84, bowling: 85, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-10', name: 'M. Amin', age: 24, nationality: 'Local', role: 'WK', batting: 79, bowling: 80, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'wk-11', name: 'Aslam Sattar', age: 24, nationality: 'Local', role: 'WK', batting: 55, bowling: 60, style: 'D', isForeign: false },
    { id: 'wk-12', name: 'Atiq Ali', age: 26, nationality: 'Local', role: 'WK', batting: 62, bowling: 72, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-13', name: 'Zahid', age: 22, nationality: 'Local', role: 'WK', batting: 77, bowling: 76, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-14', name: 'Uddin Ali', age: 26, nationality: 'Local', role: 'WK', batting: 55, bowling: 65, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'wk-15', name: 'R. Saad', age: 22, nationality: 'Local', role: 'WK', batting: 60, bowling: 70, style: 'N', isForeign: false },
    { id: 'wk-16', name: 'Hamza Iqbal', age: 23, nationality: 'Local', role: 'WK', batting: 58, bowling: 5, style: 'N', isForeign: false, traits: ['Aggression Crash'] },
];

export const RAW_DATA_FAST: RawPlayerData[] = [
    { id: 'bl-1', name: 'Ilyas', age: 24, nationality: 'Local', role: 'BL', batting: 11, bowling: 63, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-2', name: 'Waheed', age: 29, nationality: 'Local', role: 'BL', batting: 10, bowling: 55, style: 'D', isForeign: false, traits: ['mv'] },
    { id: 'bl-3', name: 'M. Ali', age: 23, nationality: 'Local', role: 'BL', batting: 23, bowling: 67, style: 'D', isForeign: false, traits: ['mv'] },
    { id: 'bl-4', name: 'Sohail', age: 39, nationality: 'Local', role: 'BL', batting: 24, bowling: 75, style: 'D', isForeign: false, traits: ['fbs'] },
    { id: 'bl-5', name: 'Zia', age: 25, nationality: 'Local', role: 'BL', batting: 23, bowling: 72, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-6', name: 'Azam', age: 25, nationality: 'Local', role: 'BL', batting: 23, bowling: 70, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-7', name: 'Faraz Khan', age: 21, nationality: 'Local', role: 'BL', batting: 12, bowling: 56, style: 'N', isForeign: false, traits: ['mv'] },
    { id: 'bl-8', name: 'Waleed', age: 25, nationality: 'Local', role: 'BL', batting: 23, bowling: 55, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-9', name: 'Atif Maqbool', age: 27, nationality: 'Local', role: 'BL', batting: 12, bowling: 53, style: 'N', isForeign: false, traits: ['m'] },
    { id: 'bl-10', name: 'Rizwan', age: 29, nationality: 'Local', role: 'BL', batting: 22, bowling: 70, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-11', name: 'Salman', age: 23, nationality: 'Local', role: 'BL', batting: 30, bowling: 73, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-12', name: 'Naseem', age: 23, nationality: 'Local', role: 'BL', batting: 22, bowling: 81, style: 'D', isForeign: false, traits: ['fb'] },
    { id: 'bl-13', name: 'Aramzad', age: 23, nationality: 'Local', role: 'BL', batting: 25, bowling: 85, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-14', name: 'M. Arif', age: 30, nationality: 'Local', role: 'BL', batting: 12, bowling: 55, style: 'D', isForeign: false, traits: ['m'] },
    { id: 'bl-15', name: 'Naeem', age: 29, nationality: 'Local', role: 'BL', batting: 22, bowling: 75, style: 'N', isForeign: false, traits: ['mv'] },
    { id: 'bl-16', name: 'Akhlaq', age: 24, nationality: 'Local', role: 'BL', batting: 22, bowling: 69, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-17', name: 'Ahsan', age: 26, nationality: 'Local', role: 'BL', batting: 22, bowling: 78, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-18', name: 'Farhan', age: 26, nationality: 'Local', role: 'BL', batting: 24, bowling: 80, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-19', name: 'Muzafar', age: 24, nationality: 'Local', role: 'BL', batting: 22, bowling: 71, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-20', name: 'Sameen', age: 28, nationality: 'Local', role: 'BL', batting: 22, bowling: 72, style: 'N', isForeign: false, traits: ['fb'] },
    { id: 'bl-21', name: 'Zohaib', age: 21, nationality: 'Local', role: 'BL', batting: 36, bowling: 85, style: 'N', isForeign: false, traits: ['fbs'] },
    { id: 'bl-22', name: 'Iqrar', age: 28, nationality: 'Local', role: 'BL', batting: 19, bowling: 90, style: 'D', isForeign: false, traits: ['fbs'] },
    { id: 'bl-23', name: 'Zubair Khan', age: 25, nationality: 'Local', role: 'BL', batting: 35, bowling: 58, style: 'D', isForeign: false, traits: ['New Ball Only'], weakness: 'fb' },
    { id: 'bl-24', name: 'Noman Shah', age: 24, nationality: 'Local', role: 'BL', batting: 34, bowling: 58, style: 'D', isForeign: false, traits: ['No Death Variation'], weakness: 'fbs' },
    { id: 'bl-25', name: 'Waseem Shah', age: 27, nationality: 'Local', role: 'BL', batting: 40, bowling: 57, style: 'N', isForeign: false, traits: ['Temperament Outburst'], weakness: 'mv' },
    { id: 'bl-26', name: 'Qasim Ali', age: 23, nationality: 'Local', role: 'BL', batting: 35, bowling: 57, style: 'D', isForeign: false, traits: ['First Over Nerves'], weakness: 'fb' },
];

export const RAW_DATA_BT: RawPlayerData[] = [
    { id: 'bt-1', name: 'Jahid', age: 27, nationality: 'Local', role: 'BT', batting: 61, bowling: 22, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-2', name: 'Shahid', age: 28, nationality: 'Local', role: 'BT', batting: 68, bowling: 45, style: 'N', isForeign: false, traits: ['os'] },
    { id: 'bt-3', name: 'Altaf', age: 30, nationality: 'Local', role: 'BT', batting: 55, bowling: 10, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-4', name: 'Yasir', age: 25, nationality: 'Local', role: 'BT', batting: 67, bowling: 12, style: 'N', isForeign: false },
    { id: 'bt-5', name: 'Nauman', age: 28, nationality: 'Local', role: 'BT', batting: 72, bowling: 12, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-6', name: 'Nasir', age: 26, nationality: 'Local', role: 'BT', batting: 81, bowling: 48, style: 'NA', isForeign: false, pos: 'OP' },
    { id: 'bt-7', name: 'Haider', age: 24, nationality: 'Local', role: 'BT', batting: 62, bowling: 25, style: 'N', isForeign: false, pos: 'Top 4' },
    { id: 'bt-8', name: 'Asad', age: 28, nationality: 'Local', role: 'BT', batting: 60, bowling: 11, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-9', name: 'Siraj', age: 30, nationality: 'Local', role: 'BT', batting: 63, bowling: 22, style: 'D', isForeign: false, pos: 'OP' },
    { id: 'bt-10', name: 'Aziz', age: 24, nationality: 'Local', role: 'BT', batting: 53, bowling: 22, style: 'A', isForeign: false },
    { id: 'bt-11', name: 'Aslam', age: 28, nationality: 'Local', role: 'BT', batting: 71, bowling: 12, style: 'D', isForeign: false },
    { id: 'bt-12', name: 'Abid', age: 32, nationality: 'Local', role: 'BT', batting: 79, bowling: 45, style: 'NA', isForeign: false, pos: 'Top 4' },
    { id: 'bt-13', name: 'Husnain', age: 28, nationality: 'Local', role: 'BT', batting: 72, bowling: 22, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-14', name: 'Qasim', age: 28, nationality: 'Local', role: 'BT', batting: 45, bowling: 12, style: 'N', isForeign: false },
    { id: 'bt-15', name: 'K. Navid', age: 29, nationality: 'Local', role: 'BT', batting: 72, bowling: 45, style: 'N', isForeign: false },
    { id: 'bt-16', name: 'Shoaib Khan', age: 31, nationality: 'Local', role: 'BT', batting: 56, bowling: 25, style: 'D', isForeign: false, pos: 'Finisher' },
    { id: 'bt-17', name: 'A. Usman', age: 23, nationality: 'Local', role: 'BT', batting: 53, bowling: 22, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-18', name: 'Aafaq', age: 22, nationality: 'Local', role: 'BT', batting: 50, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-19', name: 'Fakhrudin', age: 26, nationality: 'Local', role: 'BT', batting: 70, bowling: 23, style: 'D', isForeign: false },
    { id: 'bt-20', name: 'A. Hafeez', age: 29, nationality: 'Local', role: 'BT', batting: 68, bowling: 11, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-21', name: 'Hamid Hasan', age: 28, nationality: 'Local', role: 'BT', batting: 70, bowling: 10, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-22', name: 'S. Hasan', age: 30, nationality: 'Local', role: 'BT', batting: 65, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-23', name: 'Zakir', age: 23, nationality: 'Local', role: 'BT', batting: 59, bowling: 11, style: 'D', isForeign: false, pos: 'Finisher' },
    { id: 'bt-24', name: 'Sadiq', age: 24, nationality: 'Local', role: 'BT', batting: 46, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-25', name: 'A. Jamal', age: 29, nationality: 'Local', role: 'BT', batting: 59, bowling: 0, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-26', name: 'Ashfaq', age: 22, nationality: 'Local', role: 'BT', batting: 55, bowling: 10, style: 'D', isForeign: false },
    { id: 'bt-27', name: 'Farhan', age: 26, nationality: 'Local', role: 'BT', batting: 78, bowling: 10, style: 'N', isForeign: false, pos: 'OP' },
    { id: 'bt-28', name: 'M. Musa', age: 21, nationality: 'Local', role: 'BT', batting: 72, bowling: 8, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-29', name: 'Abass', age: 27, nationality: 'Local', role: 'BT', batting: 72, bowling: 0, style: 'A', isForeign: false, pos: 'Finisher' },
    { id: 'bt-30', name: 'Faisal Hasan', age: 27, nationality: 'Local', role: 'BT', batting: 83, bowling: 60, style: 'NA', isForeign: false, pos: 'Finisher' },
    { id: 'bt-31', name: 'Muhammad Shahzain', age: 23, nationality: 'Local', role: 'BT', batting: 70, bowling: 34, style: 'N', isForeign: false, pos: 'Finisher' },
    { id: 'bt-32', name: 'Azhar', age: 34, nationality: 'Local', role: 'BT', batting: 75, bowling: 45, style: 'A', isForeign: false },
    { id: 'bt-33', name: 'Ahsan Qureshi', age: 24, nationality: 'Local', role: 'BT', batting: 58, bowling: 20, style: 'A', isForeign: false, pos: 'OP', traits: ['Powerplay Dependent'] },
    { id: 'bt-34', name: 'Sajid Farooq', age: 25, nationality: 'Local', role: 'BT', batting: 59, bowling: 22, style: 'N', isForeign: false, pos: 'OP', traits: ['Spin Blindspot'] },
    { id: 'bt-35', name: 'Fahad Rafiq', age: 26, nationality: 'Local', role: 'BT', batting: 57, bowling: 21, style: 'D', isForeign: false, traits: ['Finisher or Bust'] },
];

export const getAllExtraPlayers = (): Player[] => {
    return [
        ...parseRawData(RAW_DATA_INTERNATIONAL),
        ...parseRawData(RAW_DATA_SPINNERS),
        ...parseRawData(RAW_DATA_ALLROUNDERS),
        ...parseRawData(RAW_DATA_WK),
        ...parseRawData(RAW_DATA_FAST),
        ...parseRawData(RAW_DATA_BT)
    ];
};
