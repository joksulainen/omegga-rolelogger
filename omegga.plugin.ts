import OmeggaPlugin, { OL, PS, PC } from 'omegga';
import fs from 'fs';


type Config = {};
type Storage = {};

const logFolder = './logs/roles/';

const tsRegEx = /^\[(\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3})\]\[\s*\d+\]/;

// [2025.07.17-07.48.43:644][996]LogChat: joksulainen has become Moderator (granted by joksulainen)
// [2025.07.17-07.48.46:779][179]LogChat: joksulainen (not present) is no longer Moderator (revoked by joksulainen)
const rUserRegEx = /^.+LogChat: (?<log>(?<target>[^:]+?)(?: \(not present\))? (?:has become|is no longer) (?<role>.+) \((?<action>granted|revoked) by (?<actor>.+)\))$/;

// [2025.07.17-10.09.56:565][824]LogChat: joksulainen created the New Role 1 role.
// [2025.07.17-10.10.13:141][842]LogChat: joksulainen updated the New Role role.
// [2025.07.17-10.09.16:679][453]LogChat: joksulainen removed the New Role 0 role.
const roleManageRegEx = /^.+LogChat: (?<log>(?<actor>[^:]+?) (?<action>created|updated|removed) the (?<role>.+) role\.)$/;

function validateLogFolder() {
  if (fs.existsSync(logFolder)) return;
  fs.mkdir(logFolder, { recursive: true }, err => {
    if (!err) {
      console.log("Created log folder");
    }
  });
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
    validateLogFolder();
    
    this.omegga.on('line', logLine => {
      const matchTS = logLine.match(tsRegEx)
      if (!matchTS) return;
      const ts = matchTS[1]
      
      const matchU = logLine.match(rUserRegEx);
      if (matchU) {
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, `[${ts}] ${matchU.groups.log}\n`);
        return;
      }
      
      const matchM = logLine.match(roleManageRegEx);
      if (matchM) {
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, `[${ts}] ${matchM.groups.log}\n`);
      }
    });
    
    return {};
  }
  
  async stop() {
    
  }
}
