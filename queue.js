(function() {

    var SOUNDCLOUD_GLOBALS = {
        currentSong: null, 
        songQueue: [],
        soundCloudApiClientId: '1d1479f0249a7681f9118e9b88a9b752'
    };

    $(document).ready(function() {

        // initilize soundcloud API
        SC.initialize({
            client_id: SOUNDCLOUD_GLOBALS.soundCloudApiClientId
        });

        // select important elements
        SOUNDCLOUD_GLOBALS.$playPauseButton = $('#playPauseButton');
        SOUNDCLOUD_GLOBALS.$addSongButton = $('#addSongButton');
        SOUNDCLOUD_GLOBALS.$skipSongButton = $('#skipSongButton');
        SOUNDCLOUD_GLOBALS.$inputTextBox = $('#addSongInputBox');
        SOUNDCLOUD_GLOBALS.$currentSongShowcase = $('#currentSongShowcase');
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseText = $('#currentSongShowcaseText');
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseAlbumArt = $('#currentSongShowcaseAlbumArt');
        SOUNDCLOUD_GLOBALS.$songList = $('#songList');

        // initialize page event handlers
        initialize();

    });


    function initialize() {

        // start with ctrl buttons greyed out
        greyOutButons();

        // hide showcase by default
        SOUNDCLOUD_GLOBALS.$currentSongShowcase.hide();

        // add click event handlers to buttons
        SOUNDCLOUD_GLOBALS.$addSongButton.click(onAddSongButtonClicked);

        SOUNDCLOUD_GLOBALS.$playPauseButton.click(onPlayPauseButtonClicked);

        SOUNDCLOUD_GLOBALS.$skipSongButton.click(onSkipSongButtonClicked);

        // set key input listener
        $(window).keypress(handleKeyInput);

        // select text when text box is clicked
        SOUNDCLOUD_GLOBALS.$inputTextBox.focus(function(){
            $(this).select();
        });

        // make song list drag and dropable
        SOUNDCLOUD_GLOBALS.$songList.sortable({
            update: onSongListUpdate, 
            start: onSongListDragStart
        });

    };


    /* Event Handlers */

    function handleKeyInput(event) {

        // keybord input handler
        switch (event.keyCode) {
            case 13:
                // press enter to add song
                event.preventDefault();
                SOUNDCLOUD_GLOBALS.$addSongButton.click();
                break;

            case 32:
                // space bar to pause/play song
                event.preventDefault();
                SOUNDCLOUD_GLOBALS.$playPauseButton.click();
                break;

            case 83:
                // s key to skip current song
                event.preventDefault();
                SOUNDCLOUD_GLOBALS.$skipSongButton.click();
                break;

            default:
                break;

        };

    };

    function onAddSongButtonClicked() {

            // get song link text from input text box
            var songLink = SOUNDCLOUD_GLOBALS.$inputTextBox.val();

            if(songLink !== '') {

                // resolve track link to get track ID
                SC.resolve(songLink).then(function(response){

                    // get info from api response
                    var albumArt = response.artwork_url;
                    var songTitle = response.title;
                    var songId = response.id;

                    // stream track
                    SC.stream('/tracks/' + songId).then(function(sound) {

                        // now show ctrl buttons at normal color
                        unGreyOutButtons();

                        // add song to song queue
                        addSongToQueue({ 'sound': sound, 'title': songTitle, 'albumArt': albumArt });

                    });

                }, function(error) {
                    
                    switch(error.status) {
                        case 403:
                            alert('Sorry, this artists does not allow thier tracks to be streamed in 3rd party applications.');
                            break;

                        case 404:
                            alert('Could not find track.');
                            break

                        default:
                            alert('Something went wrong.')
                            break;

                    }

                });

                // clear text box
                SOUNDCLOUD_GLOBALS.$inputTextBox.val('');

            }

    };

    function onPlayPauseButtonClicked() {

        // if we have a current song
        if(SOUNDCLOUD_GLOBALS.currentSong) {
            toggleSongState();
        }

        // no current song, but song queue has items
        else if(!isSongQueueEmpty()) {
            playNextSong();
        }

    };

    function onSkipSongButtonClicked() {
        if(SOUNDCLOUD_GLOBALS.currentSong) {
            playNextSong();
        }
    };

    function onSongListDragStart(event, ui) {
        SOUNDCLOUD_GLOBALS.activeSongListEntryOldIndex = ui.item.index();
    };

    function onSongListUpdate(event, ui) {
        moveSongQueueItem(ui.item.index(), SOUNDCLOUD_GLOBALS.activeSongListEntryOldIndex);
    };


    /* Helper Functions */

    function playNextSong() {

        // if there is a current song playing, pause it
        if(SOUNDCLOUD_GLOBALS.currentSong) {

            // if current song is playing, pause it
            if(SOUNDCLOUD_GLOBALS.currentSong.sound._isPlaying) {
                SOUNDCLOUD_GLOBALS.currentSong.sound.pause();
            }

            // make sure song is started at begining if played again
            SOUNDCLOUD_GLOBALS.currentSong.sound.seek(0);
            
            // no songs in queue, so no current song
            SOUNDCLOUD_GLOBALS.currentSong = null;

            // hide showcase
            SOUNDCLOUD_GLOBALS.$currentSongShowcase.hide();

        }


        if(!isSongQueueEmpty()) {

            // get next song in queue
            SOUNDCLOUD_GLOBALS.currentSong = getNextSongFromQueue();

            // when song is over...
            SOUNDCLOUD_GLOBALS.currentSong.sound.on('finish', function() {

                // if currently re-aranging songs, cancel it
                SOUNDCLOUD_GLOBALS.$songList.sortable('cancel');

                // start next song
                playNextSong();

            });

            // start song
            SOUNDCLOUD_GLOBALS.currentSong.sound.play();

            // make sure play button is in right state
            setPlayPauseButton('pause');

        } else {

            // grey out ctrl buttons
            greyOutButons();

        }

    };

    function toggleSongState() {

        if(SOUNDCLOUD_GLOBALS.currentSong) {

            // play or pause song
            if(SOUNDCLOUD_GLOBALS.currentSong.sound._isPlaying) {
                SOUNDCLOUD_GLOBALS.currentSong.sound.pause();
                setPlayPauseButton('play');
            } else {
                SOUNDCLOUD_GLOBALS.currentSong.sound.play();
                setPlayPauseButton('pause');
            }
        } 

    };

    function greyOutButons() {
        // fade buttons to grey
        SOUNDCLOUD_GLOBALS.$playPauseButton.fadeTo(100, 0.3);
        SOUNDCLOUD_GLOBALS.$skipSongButton.fadeTo(100, 0.3);
    };

    function unGreyOutButtons() {
        // set buttons to normal color
        SOUNDCLOUD_GLOBALS.$playPauseButton.fadeTo(100, 1.0);
        SOUNDCLOUD_GLOBALS.$skipSongButton.fadeTo(100, 1.0);
    };

    function setPlayPauseButton(newState) {

        if(typeof newState === 'string') {
            if(newState === 'play') {
                SOUNDCLOUD_GLOBALS.$playPauseButton.removeClass('pause');
                SOUNDCLOUD_GLOBALS.$playPauseButton.addClass('play');
            } else if(newState === 'pause') {
                SOUNDCLOUD_GLOBALS.$playPauseButton.removeClass('play');
                SOUNDCLOUD_GLOBALS.$playPauseButton.addClass('pause');
            }
        }

    }


    /* Song Queue Management Functions */

    function isSongQueueEmpty() {
        // check if song queue has any songs
        return SOUNDCLOUD_GLOBALS.songQueue.length === 0;
    };

    function addSongToQueue(song) {

        // add to song queue
        SOUNDCLOUD_GLOBALS.songQueue.push(song);

        // build song list entry element
        var songListEntry = $('<li/>', {
            class: 'songListEntry',
        });

        // add song title to song list entry
        $('<div/>', {
            class: 'songListEntryText',
            text: song.title
        }).appendTo(songListEntry);

        // and song list entry to song list
        songListEntry.appendTo(SOUNDCLOUD_GLOBALS.$songList);

    };

    function getNextSongFromQueue() {

        // get next song in queue
        var nextSong = SOUNDCLOUD_GLOBALS.songQueue.shift();

        // get top element of song list
        SOUNDCLOUD_GLOBALS.$songList.find('.songListEntry').first().remove();

        // change album art in showcase to show current song
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseAlbumArt.css({
            'background-image': 'url(' + nextSong.albumArt + ')'
        });

        // change song title in showcase
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseText.text(nextSong.title);

        // show showcase
        SOUNDCLOUD_GLOBALS.$currentSongShowcase.show();

        return nextSong;

    };

    function moveSongQueueItem(posNew, posOld) {

        if(Number.isInteger(posNew) && Number.isInteger(posOld)) {

            // remove song from old position in song queue
            var songQueueItem = SOUNDCLOUD_GLOBALS.songQueue.splice(posOld, 1)[0];

            // insert song into new position in song queue
            SOUNDCLOUD_GLOBALS.songQueue.splice(posNew, 0, songQueueItem);

        }

    };

}());