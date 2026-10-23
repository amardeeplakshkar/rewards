import * as migration_20261011_143932 from './20261011_143932';
import * as migration_20261023_151902 from './20261023_151902';

export const migrations = [
  {
    up: migration_20261011_143932.up,
    down: migration_20261011_143932.down,
    name: '20261011_143932',
  },
  {
    up: migration_20261023_151902.up,
    down: migration_20261023_151902.down,
    name: '20261023_151902'
  },
];
