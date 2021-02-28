'use strict';

// imports
import { default as AsciiTable } from 'ascii-table';
import { default as fsWalk } from '@nodelib/fs.walk';
import { default as musicMetadata } from 'music-metadata';
import { default as SpotifyWebApi } from 'spotify-web-api-node';
import { default as util } from 'util';
import { default as yargs } from 'yargs';
import { hideBin as hideBin } from 'yargs/helpers';
import { default as Bottleneck } from 'bottleneck';

import { spotifySecrets as spotifySecrets } from './secrets.mjs';

// setup constants
const spotifyApi = new SpotifyWebApi({
  clientId: spotifySecrets.clientId,
  clientSecret: spotifySecrets.clientSecret,
});

const fsWalk_walk = util.promisify(fsWalk.walk);

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 666,
});

// parse args
const argv = yargs(hideBin(process.argv))
.usage('Usage: $0 <command> [options]')
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
  command: 'scan [directory]',
  description: 'Recursively scan a directory, checking each file against Spotify',
  handler: (argv) => { scanDir(argv); }
})
.argv;




// read the directory
async function scanDir(argv) {
  spotifyApi.clientCredentialsGrant()
  .then(async (tokenData) => {
    spotifyApi.setAccessToken(tokenData.body['access_token']);
    
    if (argv.verbose || argv.debug) console.log(`Scanning ${argv.directory}`);
    const walkSettings = new fsWalk.Settings ({
      followSymbolicLinks: false,
      entryFilter: (entry) => {
        const regex = new RegExp('^.*(?=\.flac$|\.mp3$|\.m4a$)'); // adjust as needed if you have different filetypes
        return regex.test(entry.name);
      }
    });
    const fileEntries = await fsWalk_walk(argv.directory, walkSettings)
    if (argv.debug) console.log(`First entry: ${fileEntries[0]}`);
    if (argv.verbose) console.log(`Found ${fileEntries.length} files`);
    
    fileEntries.forEach(async (entry) => {
      const fileMetadata = await musicMetadata.parseFile(entry.path);
      if (argv.debug) console.log(fileMetadata.common);

      try { 
        limiter.schedule(() => spotifyApi.searchTracks(`${fileMetadata.common.artist} ${fileMetadata.common.title}`))
        .then((spotifyMetadata) => {
          if (typeof spotifyMetadata != 'undefined') {  // if we get a response from spotify
            //console.log(spotifyMetadata);
            var match = false;

            if (spotifyMetadata.body.tracks.total != 0) {
              spotifyMetadata.body.tracks.items.forEach((track) => {
                if (track.album.name == fileMetadata.common.album) {
                  match = true;
                  console.log(`MATCH: ${fileMetadata.common.artist} - ${fileMetadata.common.title}`)
                } else {
                  console.log(`NO MATCH: ${fileMetadata.common.album} != ${track.album.name}`);
                }
              });
            } else {
              match = false;
              console.log(`NO RESULT: ${fileMetadata.common.artist} - ${fileMetadata.common.title}`);
            }
          } else {
            console.log(`NO RESPONSE: ${fileMetadata.common.artist} - ${fileMetadata.common.title}`);
          }  
          //console.log(spotifyMetadata.body.tracks.items);
        });
      }
      catch (error) { console.log(error); }
    });
  });
}



// print number of items found

// make req's to spotify
/*
with each
- compare album with each result
- if album match report full match
- if no album match then report partial match
- if no result from spotify report no match
*/

// print results
/*
options to aggregate by artist and album
status    artist              album   title   reason        spotify_url
partial   foo and the bar's   baz     alice   wrong_album   https://open.spotify.com/whatever
*/
