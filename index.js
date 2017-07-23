const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYouTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var guilds = {};

var queue = [];
var queueNames = [];
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];

client.login(discord_token);

client.on('message', function(message) {
  const member = message.member;
  const mess = message.content.toLowerCase();
  const args = message.content.split(' ').slice(1).join(' ');
  
  if (mess.startsWith(prefix + 'play')) {
          if (queue.length > 0 || isPlaying) {
        getID(args, function(id) {
          add_to_queue(id);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            message.reply(" added to queue **" + videoInfo.title + "**");
          });
        });
      } else {
        isPlaying = true;
        getID(args, function(id) {
          queue.push("placeholder");
          playMusic(id, message);
          fetchVideoInfo(id, function(err, videoInfo) {
            if (err) throw new Error(err);
            message.reply(" now playing **" + videoInfo.title + "**");
          });
        });
      }
    } else if (mess.startsWith(prefix + "skip")){
      if(skippers.indexOf(message.author.id) === -1){
        skippers.push(message.author.id);
        skipReq++;
        if(skipReq >= Math.ceil((voiceChannel.members.size - 1) /2 )) {
           skip_song(message);
        message.reply("Your Skip has Benn Acknoledged.Skipping now");
        
           } else {
             message.reply("Your Skip has Benn Acknoledged. You Need **" + Math.ceil((voiceChannel.member.size -1) / 2) - skipReq)+"** more skip votes";
      }
      } else {
        message.reply("you Already voted To Skip")
      }
    }
});

client.on('ready', function() {
  console.log('So fucking ready!');
});
function skip_song(message) {
  dispatcher.end();
    if(queue.length > 1) {
        playMusic(queue[0], message);
    } else {
    skipReq = 0
    skippers = [];
  }
}

function playMusic(id, message) {
 voiceChannel = message.member.voiceChannel;


  voiceChannel.join().then(function(connection) {
      stream = ytdl("https://youtube.com/watch?v=" + id, {
        filter: 'audioonly'
      });
      skipReq = 0;
      skippers = [];

      dispatcher = connection.playStream(stream);
      dispatcher.on('end', function (){
    skipReq = 0;
    skippers = [];
    queue.shift();
        if(queue.length === 0){
          queue = [];
          isPlaying = false ;
        }else{
          playMusic(queue[0],message);
        }
  });
  });
  
}

function getID(str, cb) {
  if (isYoutube(str)) {
    cb(getYouTubeID(str));
  } else {
    search_video(str, function(id) {
      cb(id);
    });
  }
}

function add_to_queue(strID) {
  if (isYoutube(strID, message)) {
    queue.push(getYouTubeID(strID));
  } else {
    queue.push(strID);
  }
}

function search_video(query, callback) {
  request('https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=' + encodeURIComponent(query) + '&key=' + yt_api_key, function(error, response, body) {
    var json = JSON.parse(body);
    callback(json.items[0].id.videoId);
  });
}

function isYoutube(str) {
  return str.toLowerCase().indexOf('youtube.com') > -1;
}
