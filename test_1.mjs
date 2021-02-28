'use strict';

import { default as fsWalk } from '@nodelib/fs.walk';
import { default as yargs } from 'yargs';
import { default as AsciiTable } from 'ascii-table';
import { hideBin as hideBin } from 'yargs/helpers';
import { default as musicMetadata } from 'music-metadata';
import { default as SpotifyWebApi } from 'spotify-web-api-node';
import { spotifySecrets as spotifySecrets } from './secrets.mjs';

const spotifyApi = new SpotifyWebApi({
  clientId: spotifySecrets.clientId,
  clientSecret: spotifySecrets.clientSecret,
});

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
  .command({
    command: 'scan [directory]',
    description: 'Recursively scan a directory, checking each file against spotify',
    handler: (argv) => {
      scan(argv);
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
    console.log(entries[0]);
    readMetadata(entries[0].path)
      .then((metadata) => {
        console.log(metadata);
      });
  });
}

function scan(argv) {
  // Retrieve an access token
  spotifyApi.clientCredentialsGrant().then(
    function(data) {
      console.log('The access token expires in ' + data.body['expires_in']);
      console.log('The access token is ' + data.body['access_token']);

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
      const walkSettings = new fsWalk.Settings ({
        followSymbolicLinks: false,
        entryFilter: (entry) => {
          const regex = new RegExp('^.*(?=\.flac$|\.mp3$|\.m4a$)');
          return regex.test(entry.name);
        }
      });
      fsWalk.walk(argv.directory, walkSettings, (err, entries) => {
        console.log(entries[0]);
        readMetadata(entries[0].path)
          .then((metadata) => {
            console.log(metadata);
            spotifyApi.searchTracks(`${metadata.common.artist} ${metadata.common.title}`)
              .then((spotifyTrackData) => {
                console.log(spotifyTrackData.body.tracks.items[0]);
              });
          });
      });
    },
    function(err) {
      console.log(
        'Something went wrong when retrieving an access token',
        err.message
      );
    }
  );
}


async function readMetadata (path) {
  return await musicMetadata.parseFile(path);
}