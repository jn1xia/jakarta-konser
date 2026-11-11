// Every venue the engine can draw, keyed by id.

import jis from './jis.js';
import gbkMain from './gbk-main.js';

export const VENUES = {
  [jis.id]: jis,
  [gbkMain.id]: gbkMain
};
