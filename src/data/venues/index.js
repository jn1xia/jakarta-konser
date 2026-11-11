// Every venue the engine can draw, keyed by id.

import jis from './jis.js';
import gbkMain from './gbk-main.js';
import indonesiaArena from './indonesia-arena.js';
import istora from './istora.js';
import madya from './madya.js';
import { iceBsd56, iceBsd5 } from './ice-bsd.js';

export const VENUES = Object.fromEntries(
  [jis, gbkMain, indonesiaArena, istora, madya, iceBsd56, iceBsd5].map((v) => [v.id, v])
);
