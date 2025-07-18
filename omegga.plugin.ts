import OmeggaPlugin, { OL, PS, PC } from 'omegga';
import fs from 'fs';

type Config = {};
type Storage = {};

const tsRegEx = /^\[(\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3})\]\[\s*\d+\]/;
const roleURegEx = /^\[\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3}\]\[\s*\d+\]LogChat: (?<log>(?<target>[^:]+?)(?<targetp> \(not present\))? (?:has become|is no longer) (?<role>.+) \((?<action>granted|revoked) by (?<actor>.+)\))$/;
const roleMRegEx = /^\[\d{4}\.\d\d\.\d\d-\d\d\.\d\d\.\d\d:\d{3}\]\[\s*\d+\]LogChat: (?<log>(?<actor>[^:]+?) (?<action>created|updated|removed) the (?<role>.+) role\.)$/;
const logFolder = './logs/roles/';

function validateLogFolder() {
  if (fs.existsSync(logFolder)) { return; }
  fs.mkdir(logFolder, { recursive: true }, (err) => {
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
    
    this.omegga.on('line', (logLine: string) => {
      const matchTS = logLine.match(tsRegEx)
      if (!matchTS) { return; }
      const ts = matchTS[1]
      
      const matchU = logLine.match(roleURegEx);
      if (matchU) {
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, `[${ts}] ${matchU.groups.log}\n`);
        return;
      }
      
      const matchM = logLine.match(roleMRegEx);
      if (matchM) {
        fs.appendFileSync(logFolder + `${ts.substring(0, 10)}.log`, `[${ts}] ${matchM.groups.log}\n`);
      }
    });
    
    return {};
  }
  
  async stop() {
    
  }
}
