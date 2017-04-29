(function() {

    var SOUNDCLOUD_GLOBALS = {
        currentSong: null, 
        songQueue: [],
        soundCloudApiClientId: '1d1479f0249a7681f9118e9b88a9b752'
    };

    $(document).ready(function() {

        // initilize soundcloud SDK
        SC.initialize({
            client_id: SOUNDCLOUD_GLOBALS.soundCloudApiClientId
        });

        // select important elements
        SOUNDCLOUD_GLOBALS.$playPauseButton = $('#playPauseButton');
        SOUNDCLOUD_GLOBALS.$addSongButton = $('#addSongButton');
        SOUNDCLOUD_GLOBALS.$skipSongButton = $('#skipSongButton');
        SOUNDCLOUD_GLOBALS.$inputTextBox = $('#addSongInputBox');
        SOUNDCLOUD_GLOBALS.$currentSongShowcase = $('#currentSongShowcase');
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseTitle = $('#currentSongShowcaseTitle');
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseAlbumArt = $('#currentSongShowcaseAlbumArt');
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseArtist = $('#currentSongShowcaseArtist');
        SOUNDCLOUD_GLOBALS.$songList = $('#songList');
        SOUNDCLOUD_GLOBALS.$songListSpacer = $('#songListSpacer');

        // initialize page event handlers
        initialize();

    });


    function initialize() {

        // hide showcase by default
        SOUNDCLOUD_GLOBALS.$currentSongShowcase.hide();
        SOUNDCLOUD_GLOBALS.$songListSpacer.hide();

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

                    console.log(response);

                    // get info from api response
                    var albumArt = response.artwork_url.replace("large.jpg", "t300x300.jpg"); // create link for 300x300 sized album art
                    var songTitle = response.title;
                    var artistName = response.user.username;
                    var songId = response.id;

                    // stream track
                    SC.stream('/tracks/' + songId).then(function(sound) {

                        // add song to song queue
                        addSongToQueue({ 'sound': sound, 'title': songTitle, 'artist':artistName, 'albumArt': albumArt });

                        // if no current song playing, play song
                        if(SOUNDCLOUD_GLOBALS.currentSong === null) {
                            playNextSong();
                        }

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

        // if we have a current song...
        if(SOUNDCLOUD_GLOBALS.currentSong !== null) {
            toggleSongState();
        }

        // no current song, but song queue has items...
        else if(!isSongQueueEmpty()) {
            playNextSong();
        }

    };

    function onSkipSongButtonClicked() {
        if(SOUNDCLOUD_GLOBALS.currentSong !== null) {
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

            // make sure song is started at begining if played again (fixes SC SDK bug)
            SOUNDCLOUD_GLOBALS.currentSong.sound.seek(0);
            
            SOUNDCLOUD_GLOBALS.currentSong = null;

            // hide showcase
            SOUNDCLOUD_GLOBALS.$currentSongShowcase.hide();
            SOUNDCLOUD_GLOBALS.$songListSpacer.hide();

        }

        if(!isSongQueueEmpty()) {

            // get next song in queue
            SOUNDCLOUD_GLOBALS.currentSong = getNextSongFromQueue();

            // when song is over...
            SOUNDCLOUD_GLOBALS.currentSong.sound.on('finish', function() {

                // if currently re-aranging songs, cancel drag and drop
                SOUNDCLOUD_GLOBALS.$songList.sortable('cancel');

                // start next song
                playNextSong();

            });

            // start song
            SOUNDCLOUD_GLOBALS.currentSong.sound.play();

            // set play button to correct visual state
            setPlayPauseButtonVisualState('pause');

        } 

    };

    function toggleSongState() {

        if(SOUNDCLOUD_GLOBALS.currentSong) {

            // play or pause song
            if(SOUNDCLOUD_GLOBALS.currentSong.sound._isPlaying) {
                SOUNDCLOUD_GLOBALS.currentSong.sound.pause();
                setPlayPauseButtonVisualState('play');
            } else {
                SOUNDCLOUD_GLOBALS.currentSong.sound.play();
                setPlayPauseButtonVisualState('pause');
            }
        } 

    };

    function setPlayPauseButtonVisualState(newState) {

        if(typeof newState === 'string') {
            if(newState === 'play') {
                SOUNDCLOUD_GLOBALS.$playPauseButton.removeClass('pause');
                SOUNDCLOUD_GLOBALS.$playPauseButton.addClass('play');
            } else if(newState === 'pause') {
                SOUNDCLOUD_GLOBALS.$playPauseButton.removeClass('play');
                SOUNDCLOUD_GLOBALS.$playPauseButton.addClass('pause');
            }
        }

    };


    /* Song Queue Management Functions */

    function isSongQueueEmpty() {
        // check if song queue has any songs
        return SOUNDCLOUD_GLOBALS.songQueue.length === 0;
    };

    function addSongToQueue(song) {

        // add to song queue
        SOUNDCLOUD_GLOBALS.songQueue.push(song);

        rebuildSongListDOM();

    };

    function getNextSongFromQueue() {

        // get next song in queue
        var nextSong = SOUNDCLOUD_GLOBALS.songQueue.shift();

        // change album art in showcase to show current song
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseAlbumArt.css({
            'background-image': 'url(' + nextSong.albumArt + ')'
        });

        // change song title in showcase
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseTitle.text(nextSong.title);

        // change artist in showcase
        SOUNDCLOUD_GLOBALS.$currentSongShowcaseArtist.text(nextSong.artist);

        // show showcase
        SOUNDCLOUD_GLOBALS.$currentSongShowcase.show();
        SOUNDCLOUD_GLOBALS.$songListSpacer.show();

        rebuildSongListDOM();

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

    function removeSong(index) {

        // remove song from queue
        SOUNDCLOUD_GLOBALS.songQueue.splice(index, 1);

        rebuildSongListDOM();

    };

    function rebuildSongListDOM() {

        // clear current song list DOM
        SOUNDCLOUD_GLOBALS.$songList.empty();

        // build new DOM from song queue
        SOUNDCLOUD_GLOBALS.songQueue.forEach(function(song) {

            // build song list entry element
            var songListEntry = $('<li/>', {
                class: 'songListEntry',
            });

            // add song title to song list entry
            $('<div/>', {
                class: 'songListEntryText',
                text: song.title
            }).appendTo(songListEntry);

            // add remove song button
            $('<div/>', {
                class: 'removeSongButton'
            })
            .click(function() {
                removeSong($(this).parent().index());
            })
            .appendTo(songListEntry);

            // and song list entry to song list
            songListEntry.appendTo(SOUNDCLOUD_GLOBALS.$songList);

        });

    };    

}());