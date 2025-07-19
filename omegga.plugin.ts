import { OmeggaPlugin, OL, PS, PC, OmeggaPlayer } from 'omegga';
import fs from 'fs';


type Config = {};
type Storage = {};

const logFolder = './logs/roles/';

const tsRegEx = /^\[(\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3})\]\[\s*\d+\]/;

// [2025.07.17-07.48.43:644][996]LogChat: joksulainen has become Moderator (granted by joksulainen)
// [2025.07.17-07.48.46:779][179]LogChat: joksulainen (not present) is no longer Moderator (revoked by joksulainen)
const rUserRegEx = /^.+LogChat: (?<target>[^:]+?)(?<targetp> \(not present\))? (?<actiont>has become|is no longer) (?<role>.+) \((?<action>granted|revoked) by (?<actor>.+)\)$/;

// [2025.07.17-10.09.56:565][824]LogChat: joksulainen created the New Role 1 role.
// [2025.07.17-10.10.13:141][842]LogChat: joksulainen updated the New Role role.
// [2025.07.17-10.09.16:679][453]LogChat: joksulainen removed the New Role 0 role.
const rManageRegEx = /^.+LogChat: (?<actor>[^:]+?) (?<action>created|updated|removed) the (?<role>.+) role\.$/;

function findPlayersByExactDisplayName(name: string): OmeggaPlayer[] {
  let result: OmeggaPlayer[] = Array<OmeggaPlayer>();
  
  for (const player of Omegga.players) {
    if (player.displayName !== name) continue;
    result.push(player);
  }
  
  return result;
}

function playerArrayToString(array: OmeggaPlayer[]): string {
  if (array.length === 0) return '[]';
  
  let string = '[';
  
  for (const player of array) {
    string += player.name + ', ';
  }
  
  string = string.substring(0, string.lastIndexOf(', ')) + ']';
  return string;
}

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;
  
  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }
  
  async init() {
    if (fs.existsSync(logFolder)) return;
    fs.mkdir(logFolder, { recursive: true }, err => {
      if (!err) {
        console.log('Created log folder');
      }
    });
    
    this.omegga.on('line', logLine => {
      const matchTimestamp = logLine.match(tsRegEx);
      if (!matchTimestamp) return;
      const ts = matchTimestamp[1];
      
      const matchUser = logLine.match(rUserRegEx);
      if (matchUser) {
        const { target, targetp, actiont, role, action, actor } = matchUser.groups;
        
        let targetNames: string = undefined;
        
        if (!targetp) {
          const targetPlayers = findPlayersByExactDisplayName(target);
          targetNames = playerArrayToString(targetPlayers);
        }
        
        const actorPlayers = findPlayersByExactDisplayName(actor);
        
        // uncomment when missing permissions for default roles get inserted in getPermissions()
        // actorPlayers.filter((player, _, __) => {
        //   return player.getPermissions()['BR.Permission.GrantRoles'];
        // });
        
        const actorNames: string = actorPlayers.length !== 0 ? playerArrayToString(actorPlayers) : '[SERVER]';
        
        const log = `[${ts}] ${target}${targetp ?? ' ' + targetNames} ${actiont} ${role} (${action} by ${actor}${actorNames ? ' ' + actorNames : ''})\n`;
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, log);
        return;
      }
      
      const matchManage = logLine.match(rManageRegEx);
      if (matchManage) {
        const { actor, action, role } = matchManage.groups;
        
        const actorPlayers = findPlayersByExactDisplayName(actor);
        
        // uncomment when missing permissions for default roles get inserted in getPermissions()
        // actorPlayers.filter((player, _, __) => {
        //   return player.getPermissions()['BR.Permission.EditRoles'];
        // });
        
        const actorNames: string = actorPlayers.length !== 0 ? playerArrayToString(actorPlayers) : '[SERVER]';
        
        const log = `[${ts}] ${actor}${actorNames ? ' ' + actorNames : ''} ${action} the ${role} role\n`;
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, log);
      }
    });
    
    return {};
  }
  
  async stop() {
    
  }
}
