import { OmeggaPlugin, OL, PS, PC, OmeggaPlayer } from 'omegga';
import fs from 'fs';
import fetch from 'node-fetch';


// plugin config and storage
type Config = {
  check_updates: boolean
  ignore_roles: string[]
  emphasize_roles: string[]
};

type Storage = {};

// update notifier constants
const PLUGIN_VERSION = '0.4.0';
const GITHUB_URL = 'https://api.github.com/repos/joksulainen/omegga-rolelogger/releases/latest';

// location for logs
const logFolder = './logs/roles/';

// regex stuff
const tsRegEx = /^\[(\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3})\]\[\s*\d+\]/;

// [2025.07.17-07.48.43:644][996]LogChat: joksulainen has become Moderator (granted by joksulainen)
// [2025.07.17-07.48.46:779][179]LogChat: joksulainen (not present) is no longer Moderator (revoked by joksulainen)
const rUserRegEx = /^.+LogChat: (?<target>[^:]+?)(?<targetp> \(not present\))? (?<actiont>has become|is no longer) (?<role>.+) \((?<action>granted|revoked) by (?<actor>.+)\)$/;

// [2025.07.17-10.09.56:565][824]LogChat: joksulainen created the New Role 1 role.
// [2025.07.17-10.10.13:141][842]LogChat: joksulainen updated the New Role role.
// [2025.07.17-10.09.16:679][453]LogChat: joksulainen removed the New Role 0 role.
const rManageRegEx = /^.+LogChat: (?<actor>[^:]+?) (?<action>created|updated|removed) the (?<role>.+) role\.$/;

// helper functions
function findPlayersByExactDisplayName(name: string): OmeggaPlayer[] {
  const result: OmeggaPlayer[] = Array<OmeggaPlayer>();
  
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

function ansiWrapper(ansi: string, string: string): string {
  return ansi + string + '\x1b[0m';
}

function semverIsGreater(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { numeric: true }) > 0;
}

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;
  updateNotifierInterval: NodeJS.Timeout;
  
  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
    this.loggerCallback = this.loggerCallback.bind(this);
    this.updateNotifierCallback = this.updateNotifierCallback.bind(this);
  }
  
  async updateNotifierCallback() {
    // fetch the latest release from github
    const data = await (await fetch(GITHUB_URL, { 
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })).json();
    
    // we probably shouldnt continue if its a pre-release
    if (data['prerelease']) return;
    
    // see if the tag name is a specific format and grab the semver of it, otherwise end early
    const githubVersionMatch = ((data['tag_name'] as string).match(/^v((?:\d+)\.(?:\d+)\.(?:\d+))$/));
    if (!githubVersionMatch) return;
    const githubVersion = githubVersionMatch[1];
    
    // proceed if githubVersion is a string and is a greater semver than PLUGIN_VERSION
    if (typeof githubVersion !== 'string') return;
    if (!semverIsGreater(githubVersion, PLUGIN_VERSION)) return;
    
    // there is a newer version available on github, we should log it
    this.omegga.broadcast(`[<color="#AAFFAA">rolelogger</>]: A new version is available: ${PLUGIN_VERSION} -> ${githubVersion}`);
    console.info(`A new version is available: ${PLUGIN_VERSION} -> ${githubVersion}`);
  }
  
  async loggerCallback(logLine: string) {
    const matchTimestamp = logLine.match(tsRegEx);
    if (!matchTimestamp) return;
    const ts = matchTimestamp[1];
    
    // match for user role log entry
    const matchUser = logLine.match(rUserRegEx);
    if (matchUser) {
      // unpack named capture groups
      const { target, targetp, actiont, role, action, actor } = matchUser.groups;
      
      // end early if the role is ignored and not emphasized
      const rEmphasized = this.config.emphasize_roles.includes(role);
      if (this.config.ignore_roles.includes(role) && !rEmphasized) return;
      
      // compile array of target usernames that have the given display name
      let targetNames: string = undefined;
      
      if (!targetp) {
        const targetPlayers = findPlayersByExactDisplayName(target);
        targetNames = playerArrayToString(targetPlayers);
      }
      
      // compile array of actor usernames that have the given display name
      const actorPlayers = findPlayersByExactDisplayName(actor);
      
      // filter out players with insufficient permissions
      // ! uncomment when missing permissions for default roles get inserted in getPermissions()
      // actorPlayers.filter((player, _index, _array) => {
      //   return player.getPermissions()['BR.Permission.GrantRoles'];
      // });
      
      // construct string to display in log
      const actorNames: string = actorPlayers.length !== 0 ? playerArrayToString(actorPlayers) : '[SERVER]';
      
      // write log to file
      const log = `[${ts}] ${target}${targetp ?? ' ' + targetNames} ${actiont} ${role} (${action} by ${actor} ${actorNames})`;
      fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, (rEmphasized ? ansiWrapper('\x1b[33m', log) : log) + '\n');
      return; // we cant match a log entry to a different type than that which was matched
    }
    
    // match for role management log entry
    const matchManage = logLine.match(rManageRegEx);
    if (matchManage) {
      // unpack named capture groups
      const { actor, action, role } = matchManage.groups;
      
      // end early if the role is ignored and not emphasized
      const rEmphasized = this.config.emphasize_roles.includes(role);
      if (this.config.ignore_roles.includes(role) && !rEmphasized) return;
      
      // compile array of actor usernames that have the given display name
      const actorPlayers = findPlayersByExactDisplayName(actor);
      
      // filter out players with insufficient permissions
      // ! uncomment when missing permissions for default roles get inserted in getPermissions()
      // actorPlayers.filter((player, _index, _array) => {
      //   return player.getPermissions()['BR.Permission.EditRoles'];
      // });
      
      // construct string to display in log
      const actorNames: string = actorPlayers.length !== 0 ? playerArrayToString(actorPlayers) : '[SERVER]';
      
      // write log to file
      const log = `[${ts}] ${actor} ${actorNames} ${action} the ${role} role`;
      fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, (rEmphasized ? ansiWrapper('\x1b[33m', log) : log) + '\n');
    }
  }
  
  async init() {
    // create log folder if it doesnt exist
    if (!fs.existsSync(logFolder)) {
      fs.mkdir(logFolder, { recursive: true }, (err) => {
        if (!err) {
          console.log('Created log folder');
        }
      });
    }
    
    // add listener to listen for brickadia log lines
    this.omegga.on('line', this.loggerCallback);
    
    // add an interval for the update notifier if check_update config option is enabled and run the notifier once
    if (this.config.check_updates) {
      this.updateNotifierInterval = setInterval(this.updateNotifierCallback, 14400000); // every 4 hours: 4*60*60*1000
      this.updateNotifierCallback();
    }
    
    return {};
  }
  
  async stop() {
    // clean up listener for no reason lol
    this.omegga.off('line', this.loggerCallback);
    if (this.config.check_updates) {
      clearInterval(this.updateNotifierInterval);
    }
  }
}
