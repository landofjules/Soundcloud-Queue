var client_id = '';
var songQueue = new LinkedListQueue();

var currSong;
var songCount = 0;
var playing = false;
var selected = false;

$(document).ready(function() {

    //initilize soundcloud API
    SC.initialize({
        client_id: ''
    });

    //start pause button grey
    $("#playPause").fadeTo(100, 0.3);

    //when add song button is clicked
    $("#addSong").click(function() {
      if(!selected) {
        var song_link = $("#textBox").val();

        //resolve track link to get track ID
        $.get('https://api.soundcloud.com/resolve.json?url=' + song_link + '/tracks&client_id=' + client_id, function(result){

            //show new song title in correct area
            if(songCount === 0) {$("#current-song").append(result.title);}
            else {$("#playlist").append('<li>' + result.title + '</li>');}
            songCount++;

            //build song stream link
            var trackURL = "/tracks/" + result.id.toString();

            //get album cover
            var albumArt = result.artwork_url;

            //start track
            SC.stream(trackURL, {onfinish: function() {playNextSong();}}, function(sound) {
                songQueue.enqueue([sound, albumArt]);
                if(songCount === 1) {
                    $("#playPause").fadeTo(100, 1.0);
                    playNextSong();
                }
            });
        });

        //clear text box
        $("#textBox").val('');
      }
    });

    //toggle play/pause button
    $("#playPause").click(function() {
        if(songCount !== 0) {
          if(!selected) {
              if(playing) {
                currSong.pause();
                $("#playPause").html("&#9658;");
                playing = false;
                $("#playlist").sortable('enable');
              }
              else {
                currSong.play();
                $("#playPause").html("&#10074;&#10074;");
                playing = true;
                $("#playlist").sortable('disable');
              }
          }
        }
    });

    //handle skip song button
    $("#skipSong").click(function() {
        if(songCount !== 0) {
          if(!selected) {
            currSong.stop();
            playNextSong();
            $("#playPause").html("&#10074;&#10074;");
            playing = true;
            $("#playlist").sortable('disable');
          }
        }
    });

    //highlight text when text box is clicked
    $('#textBox').focus(function(){
        $(this).select();
    });

    //allow user to re-order the song queue when player is paused
    $("#playlist").sortable({
        update: function(event, ui) {
            var newIndex = ui.item.index();
            var oldIndex = $(this).attr('data-previndex');
            $(this).removeAttr('data-previndex');

            var data = songQueue.remove(oldIndex);
            songQueue.insert(newIndex, data);
            selected = false;
        },
        start: function(event, ui) {
            selected = true;
            oldIndex = $(this).attr('data-previndex', ui.item.index());
        }
    });
    $("#playlist").disableSelection();
    $("#playlist").sortable('disable');

    //handle keyboard shortcuts
    $(window).keypress(function(e) {
        switch (e.keyCode) {
          case 13:
            //enter\return to add song
            e.preventDefault();
            $("#addSong").click();
            return false;
          case 32:
            //space bar to pause/play song
            e.preventDefault();
            $("#playPause").click();
            return false;
          default:
            break;
      }
  });

});

var playNextSong = function() {

    if(songQueue.isEmpty()) {
        songCount = 0;
        playing = false;
        $("#playlist").sortable('enable');
        $("#playPause").fadeTo(100, 0.3);
        $("#current-song").html('');
        soundManager.stopAll();
        $("#album-art").attr("src", "");
        $("#album-art").css("opacity", "0.0");
        return;
    }

    if(songCount !== 1) {
        var nextSong = $("li").html();
        $("li").first().remove();
        $("#current-song").html(nextSong);
    }

    //pull next song from queue
    var songInfo = songQueue.dequeue();
    currSong = songInfo[0];
    var albumArt = songInfo[1];
    currSong.start();
    playing = true;
    $("#playlist").sortable('disable');
    $("#playPause").fadeTo(100, 1.0);
    $("#album-art").attr("src", albumArt);
    $("#album-art").css("opacity", "1.0");
};

//linked list data scructure keeps track of song queue
function LinkedListQueue() {
    this.size = 0;
    this.top = null;
    this.bottom = null;
}

function Node(dataPar) {
    this.data = dataPar;
    this.next = null;
}

LinkedListQueue.prototype.isEmpty = function() {
    if(this.size === 0) {
        return true;
    }
    return false;
};

LinkedListQueue.prototype.enqueue = function(data) {
    if(this.size === 0) {
        this.top = new Node(data);
        this.bottom = this.top;
        this.size = 1;
    }
    else {
        this.bottom.next = new Node(data);
        this.bottom = this.bottom.next;
        this.size++;
    }
};

LinkedListQueue.prototype.dequeue = function() {
    if(this.size === 0) {
        return null;
    }
    else {
        var tmp = this.top;
        this.top = tmp.next;
        tmp.next = null;
        this.size--;
        if(this.size === 0) {this.bottom = null;}
        return tmp.data;
    }
};

LinkedListQueue.prototype.insert = function(newPos, data) {

    var newNode = new Node(data);

    if(Number(newPos) === 0) {
      newNode.next = this.top;
      this.top = newNode;
      this.size++;
    }
    else if(Number(newPos) === this.size) {
      this.bottom.next = newNode;
      this.bottom = newNode;
      this.size++;
    }
    else {
      var n = this.top;
      for(var i=0; i < (Number(newPos)-1); i++) {
          n = n.next;
      }
      var tmp = n.next;
      n.next = newNode;
      newNode.next = tmp;
      this.size++;
    }
};

LinkedListQueue.prototype.remove = function(pos) {

    var tmp;

    if(Number(pos) === 0) {
        tmp = this.top;
        this.top = this.top.next;
        tmp.next = null;
        this.size--;
        if(this.size === 0) {this.bottom = null;}
        return tmp.data;
    }
    else {
        var n = this.top;

        for(var i=0; i < (Number(pos)-1); i++) {
            n = n.next;
        }

        if(Number(pos) === (this.size - 1)) {this.bottom = n;}
        tmp = n.next;
        n.next = tmp.next;
        tmp.next = null;
        this.size--;
        return tmp.data;
    }
};
