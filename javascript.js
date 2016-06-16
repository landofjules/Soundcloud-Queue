client_id = '340f063c670272fac27cfa67bffcafc4';

var songQueue = new Queue();
var currSong;
var songCount = 0;
var playing = false;

$(document).ready(function() {

    SC.initialize({
        client_id: '340f063c670272fac27cfa67bffcafc4'
    });

    //pause button starts greyed out
    $("#playPause").fadeTo(100, 0.3);

    //when add song button is clicked
    $("#addSong").click(function() {
        var song_link = $("#textBox").val();

        //resolve track link to get track ID
        $.get('http://api.soundcloud.com/resolve.json?url='+song_link+'/tracks&client_id='+client_id, function(result){

            //add song to list
            $("#playlist").append('<li>' + result.title + '</li>');
            var trackURL = "/tracks/" + result.id.toString();

            //start track
            SC.stream(trackURL,
                      {onfinish: function() {playNextSong();}},
                      function(sound) {
                songQueue.enqueue(sound);
                songCount++;
                if(songCount === 1) {
                    $("#playPause").fadeTo(100, 1.0);
                    playNextSong();
                }
            });
        });

        //clear text box
        $("#textBox").val('');
    });

    //toggle play/pause button
    $("#playPause").click(function() {
        if(songCount !== 0) {
          if(playing) {
            currSong.pause();
            $("#playPause").html("Play");
            playing = false;
          }
          else {
            currSong.play();
            $("#playPause").html("Pause");
            playing = true;
          }
        }
    });

    //highlight text when text box is clicked
    $('#textBox').focus(function(){
        $(this).select();
    });

});

var playNextSong = function() {
    if(songQueue.size() === 0) {
      songCount = 0;
      playing = false;
      $("#playPause").fadeTo(100, 0.3);
      $("li").first().remove();
      return;
    }

    if(songCount !== 1) {
      $("li").first().remove();
    }

    currSong = songQueue.dequeue();
    currSong.start();
    playing = true;
    $("playPause").fadeTo(100, 1.0);
};

//queue data structure
function Queue() {
    this.oldestIndex = 1;
    this.newestIndex = 1;
    this.storage = {};
}

Queue.prototype.size = function() {
    return this.newestIndex - this.oldestIndex;
};

Queue.prototype.enqueue = function(data) {
    this.storage[this.newestIndex] = data;
    this.newestIndex++;
};

Queue.prototype.dequeue = function() {
    var deletedData = this.storage[this.oldestIndex];
    delete this.storage[this.oldestIndex];
    this.oldestIndex++;
    return deletedData;
};
