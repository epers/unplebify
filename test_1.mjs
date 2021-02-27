'use strict';

import { default as fsWalk } from '@nodelib/fs.walk';
import { default as yargs } from 'yargs';
import { default as AsciiTable } from 'ascii-table';
import { hideBin as hideBin } from 'yargs/helpers'

/*
fsWalk.walk('/mnt/c/Users/perse/Downloads', (err, entries) => {
  console.log(entries);
});
*/

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options] [directory]')
  .showHelpOnFail(true)
  .demandCommand(1, '')
  .strict()
  .help()
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose output'
  })
  .option('debug', {
    alias: 'd',
    type: 'boolean',
    description: 'Run with debug output (implies -v)'
  })
  .command({
    command: 'walk [directory]',
    description: 'Recursively walk a directory, printing all found audio files',
    handler: (argv) => {
      walk(argv);
    }
  })
  .argv;

function walk(argv) {
  console.log(argv);
  const walkSettings = new fsWalk.Settings ({
    followSymbolicLinks: false,
    entryFilter: (entry) => {
      const regex = new RegExp('^.*(?=\.flac$|\.mp3$|\.m4a$)');
      return regex.test(entry.name);
    }
  });
  fsWalk.walk(argv.directory, walkSettings, (err, entries) => {
    console.log(entries);
  });
}
