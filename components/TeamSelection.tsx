
import React from 'react';
import { TEAMS } from '../data';

interface TeamSelectionProps {
    onTeamSelected: (teamId: string) => void;
    theme: 'light' | 'dark';
}

const TeamSelection: React.FC<TeamSelectionProps> = ({ onTeamSelected, theme }) => {
    const mainTeams = TEAMS.filter(t => !t.isYouthTeam);
    const devTeams = TEAMS.filter(t => t.isYouthTeam);

    return (
        <div className="p-6 h-full overflow-y-auto">
            <h2 className="text-3xl font-bold text-center text-teal-600 dark:text-teal-400 mb-6">Select Your Team</h2>
            
            <h3 className="text-xl font-bold mb-3 text-gray-700 dark:text-gray-300">Main League</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
                {mainTeams.map(team => (
                    <div key={team.id}
                        onClick={() => onTeamSelected(team.id)}
                        className="bg-white dark:bg-[#343E3A]/80 p-4 rounded-lg text-center cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-400 hover:bg-gray-100 dark:hover:bg-[#343E3A] transition-all duration-300 transform hover:scale-105"
                    >
                        <div className="w-20 h-20 mx-auto mb-3" dangerouslySetInnerHTML={{ __html: team.logo }}></div>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                    </div>
                ))}
            </div>

            <h3 className="text-xl font-bold mb-3 text-gray-700 dark:text-gray-300">Development Teams</h3>
            <div className="grid grid-cols-2 gap-4">
                {devTeams.map(team => (
                    <div key={team.id}
                        onClick={() => onTeamSelected(team.id)}
                        className="bg-white dark:bg-[#343E3A]/80 p-4 rounded-lg text-center cursor-pointer border-2 border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-gray-100 dark:hover:bg-[#343E3A] transition-all duration-300 transform hover:scale-105"
                    >
                         <div className="w-20 h-20 mx-auto mb-3" dangerouslySetInnerHTML={{ __html: team.logo }}></div>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamSelection;
