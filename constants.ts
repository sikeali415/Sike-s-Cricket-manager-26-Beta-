
import { Player, Team, PlayerRole } from './types';
import { generateInitialStats } from './data';

// Updated initial squad to match Player interface and use PlayerRole enum values.
export const INITIAL_SQUAD: Player[] = [];

// Fixed INITIAL_TEAM to comply with Team interface by adding the missing 'purse' property.
export const INITIAL_TEAM: Team = {
  id: 'team_mavericks',
  name: 'Mumbai Mavericks',
  squad: INITIAL_SQUAD,
  captains: {},
  /* Fix: Added missing 'purse' property required by Team interface */
  purse: 50.0,
};

// Updated market players to use correct PlayerRole enum and mandatory Player fields.
export const MARKET_PLAYERS: Player[] = [];
