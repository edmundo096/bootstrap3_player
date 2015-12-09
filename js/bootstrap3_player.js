/* global jQuery */
(function ($) {
    'use strict';

    // Search the target container to control and lister for.

    // Select the #media-container, and the audio tags that is not inside a #media-container.
    var mediaContainerTag   = $('#media-container');
    var audioTag            = $('audio[controls]:not(#media-container audio[controls])');


    // For #media-container tags, Construct and insert the player box inside the searched elements at the beginning.
    mediaContainerTag.prepend(function() {
        var srcTag = this;

        // Player type as a container, used further in the player setup.
        // Enables the use of the 'data-source' and 'data-source-type' attributes.
        //-srcTag.playerType = 'container';

        var jqSrcTag = $(srcTag);
        // Wrap
        // Youtube (TODO: At the moment, only supports 1 YT player per document)
        var ytPlayer;
        var updateFromYt, updateFromYtIntervalId;
        var isIntervalRunning = false;

        var processedPlayer = processSrc(srcTag);

        // Function which process the source type and the changes with the Data attributes.
        var processDataAttrs = function() {
            // Notification that there was a change on the data attributes.
            // (since original player was not designed to work dynamically with src and data-* changes).

            // Check the data-source-type.
            if (jqSrcTag.data('sourceType') == 'youtube') {
                // If YT player does not exists, create YouTube player.
                if ( ! ytPlayer) {
                    window.onYouTubeIframeAPIReady = function() {
                        ytPlayer = new YT.Player('yt-player', {
                            height: '390',
                            width: '640',
                            videoId: jqSrcTag.data('source'),
                            events: {
                                //'onReady': onPlayerReady,
                                'onStateChange': onPlayerStateChange
                            },
                            playerVars: {
                                controls: 0
                            }
                        });
                    };
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    jqSrcTag.prepend(tag);

                    // Set function to update player from YT player.
                    updateFromYt = function () {
                        var percentageLoaded = ytPlayer.getVideoLoadedFraction();
                        var currentTime = ytPlayer.getCurrentTime();
                        var duration = ytPlayer.getDuration();

                        // Create a simulated TimeRanges Object with only 1 range.
                        srcTag.buffered = {
                            length: 1,
                            start: function(i) { return 0; },
                            end: function(i) { return duration * percentageLoaded; }
                        };
                        srcTag.currentTime = currentTime;
                        srcTag.duration = duration;
                        srcTag.paused = ytPlayer.getPlayerState() != YT.PlayerState.PLAYING;
                        srcTag.networkState = 0;
                        srcTag.readyState = 0;  // Only used 1 time at setup.
                        srcTag.loop = 0;
                        srcTag.muted = ytPlayer.isMuted();
                        srcTag.volume = ytPlayer.getVolume()/100;

                        jqSrcTag.trigger('timeupdate');
                        jqSrcTag.trigger('volumechange');
                    };

                    // Set function to update YT player from player.
                    // TODO set an event for each
                    jqSrcTag.on('controlChange', function() {
                        ytPlayer.setVolume(srcTag.volume * 100);
                        srcTag.muted ? ytPlayer.mute() : ytPlayer.unMute();
                        ytPlayer.seekTo(srcTag.currentTime, true);
                    });
                    jqSrcTag.on('play', function(event, params) {
                        // Ignore if was from YT state change event.
                        if (params && params.isFromStateChange) return;

                        ytPlayer.playVideo();
                    });
                    jqSrcTag.on('pause', function(event, params) {
                        // Ignore if was from YT state change event.
                        if (params && params.isFromStateChange) return;

                        ytPlayer.pauseVideo();
                    });
                }
                else {
                    // YT already exists.

                    // Load and play YT video from data source.
                    ytPlayer.loadVideoById(jqSrcTag.data('source'));


                    // Update data from YouTube.
                    updateFromYt();
                }

                // Simulate that there is an image (will be changed to the YT player later).
                jqSrcTag.data('infoAlbumArt', '');
            }
            else {
                if (ytPlayer) {
                    ytPlayer.stop();
                }
            }

            // TODO move this functions..

            // Move the YT player container.
            var ytPlayerContainer = $('#yt-player').parent('.embed-responsive');
            if ( ! ytPlayerContainer)
                ytPlayerContainer = $('#yt-player');
            ytPlayerContainer.detach();

            // Update data info panel.
            recreatePlayerBoxData(srcTag,
                processedPlayer.player_box, processedPlayer.data_sec,
                processedPlayer.data_table, processedPlayer.toggle_holder);

            jqSrcTag.find('img').replaceWith(ytPlayerContainer);
        };

        ////processDataAttrs();

        jqSrcTag.on('datachange', processDataAttrs);

        // YT function.
        function onPlayerStateChange(event) {
            // Check if need to set the interval to update info from YT.
            if (event.data == YT.PlayerState.PLAYING
                || event.data == YT.PlayerState.BUFFERING) {

                // Skip interval creation if is already running.
                if (isIntervalRunning) return;

                updateFromYtIntervalId = window.setInterval(updateFromYt, 500); // x milliseconds per attempt
                isIntervalRunning = true;
            }
            else {
                window.clearInterval(updateFromYtIntervalId);
                isIntervalRunning = false;
            }

            // To set play/pause buttons state.
            if (event.data == YT.PlayerState.PLAYING)
                jqSrcTag.trigger('play', {isFromStateChange: true});
            else if (event.data == YT.PlayerState.PAUSED)
                jqSrcTag.trigger('pause', {isFromStateChange: true});
        }

        return processedPlayer.player_box;
    });


    // For audio tags, Construct and insert the player box before the searched elements.
	audioTag.before(function() {
        var srcTag = this;

        // Player type as a audio only, used further in the player setup.
        srcTag.playerType = 'audio';

        // Turn off the native audio controls.
        srcTag.controls = false;

        // TODO, handle data updates as the container does.
        return processSrc(srcTag).player_box;
    });


    function processSrc(srcTag) {

        // Create the new player container div.
        var player_box = document.createElement('div');
        $(player_box).addClass($(srcTag).attr('class') + ' well container-fluid playa');


        // Create the Metadata/Info section.
        var data_sec = document.createElement('section');
        $(data_sec).addClass('playa-data-sec collapsing center-block row col-sm-12');
        // Metadata/Info table.
        var data_table = document.createElement('table');
        $(data_table).addClass('table table-condensed');

        // Create the div that will contain the toggle button.
        var toggle_holder = document.createElement('div');
        $(toggle_holder).addClass('playa-toggle-holder btn-group center-block row col-sm-12');
        // Toggle button.
        var data_toggle = document.createElement('button');
        var jqDataToggle = $(data_toggle);
        jqDataToggle.html('<i class="glyphicon glyphicon-align-justify" style="top:-3px"></i>');
        jqDataToggle.addClass('btn btn-default btn-lg btn-block row col-sm-12');
        jqDataToggle.attr('style', 'opacity:0.3');
        jqDataToggle.click(function () {$(data_sec).collapse('toggle'); });
        jqDataToggle.attr('title', 'Details');
        jqDataToggle.tooltip({'container': 'body', 'placement': 'top', 'html': true});
        $(toggle_holder).append(data_toggle);

        // Create the player buttons section.
        var player = document.createElement('section');
        $(player).addClass('btn-group  center-block row  col-sm-12');


        fillPlayerBox(srcTag, player_box, player, data_sec, data_table, toggle_holder);

        $(srcTag).on('error', function () {
            console.log("Error encountered after fillPlayerBox");
            load_error(player_box);
        });

        // Return an object with: player_box, data_sec, data_table, toggle_holder.
        return {
            player_box: player_box,
            data_sec: data_sec,
            data_table: data_table,
            toggle_holder: toggle_holder
        };
    }


    function load_error(player_box) {
        // console.log('error');
        var jqPlayerBox = $(player_box);
        jqPlayerBox.find('.btn').addClass('disabled');
        jqPlayerBox.find('input[type="range"]').hide();
        jqPlayerBox.find('.glyphicon-refresh').text('Error');
        jqPlayerBox.find('.glyphicon-refresh').parent().attr('title', 'There was an error loading the audio.');
        jqPlayerBox.find('.glyphicon-refresh').parent().tooltip('fixTitle');
        jqPlayerBox.find('.glyphicon-refresh').removeClass('glyphicon glyphicon-refresh spin');
    } // load_error

    function addPlayBtn(srcTag, player) {
        var playBtn = document.createElement('button');
        $(playBtn).addClass('btn  btn-default disabled col-sm-1');

        playBtn.setPlayState = function (toggleStateTo) {
            $(playBtn).removeClass('disabled');
            if (toggleStateTo === 'play') {
                $(playBtn).html('<i class="glyphicon glyphicon-play"></i>');
                $(playBtn).click(function () {

                    if (srcTag.play)
                        srcTag.play();
                    else
                        $(srcTag).trigger('play');

                });
            }
            if (toggleStateTo === 'pause') {
                $(playBtn).html('<i class="glyphicon glyphicon-pause"></i>');
                $(playBtn).click(function () {

                    if (srcTag.pause)
                        srcTag.pause();
                    else
                        $(srcTag).trigger('pause');

                });
            }
        }; // setPlayState

        // media events from the audio element will trigger rebuilding the play button
        $(srcTag).on('play', function () {playBtn.setPlayState('pause'); });
        $(srcTag).on('canplay', function () {playBtn.setPlayState('play'); });
        $(srcTag).on('pause', function () {playBtn.setPlayState('play'); });

        var timeout = 0;

        var loadCheck = window.setInterval(function () {
            if (isNaN(srcTag.duration) === false) {
                playBtn.setPlayState('play');
                window.clearInterval(loadCheck);
                return true;
            }
            if (srcTag.networkState === 3 || timeout === 100) {
                // 3 = NETWORK_NO_SOURCE - no audio/video source found
                console.log('No audio source was found or a timeout occurred');
                load_error();
                window.clearInterval(loadCheck);
                return false;
            }
            timeout++;
        }, 100); // x milliseconds per attempt

        $(player).append(playBtn);
    } // addPlay

    function addSeek(srcTag, player) {
        var seek = document.createElement('input');
        $(seek).attr({
            'type': 'range',
            'min': 0,
            'value': 0,
            'class': 'seek'
        });

        seek.progress = function () {
            var i, bufferedstart, bufferedend;
            var bg = 'rgba(223, 240, 216, 1) 0%';
            bg += ', rgba(223, 240, 216, 1) ' + ((srcTag.currentTime / srcTag.duration) * 100) + '%';
            bg += ', rgba(223, 240, 216, 0) ' + ((srcTag.currentTime / srcTag.duration) * 100) + '%';

            // TODO: srcTag.buffered may not exist.
            for (i = 0; srcTag.buffered && i < srcTag.buffered.length; i++) {
                if (srcTag.buffered.end(i) > srcTag.currentTime &&
                    isNaN(srcTag.buffered.end(i)) === false &&
                    isNaN(srcTag.buffered.start(i)) === false) {

                    if (srcTag.buffered.end(i) < srcTag.duration) {
                        bufferedend = ((srcTag.buffered.end(i) / srcTag.duration) * 100);
                    } else {
                        bufferedend = 100;
                    }
                    if (srcTag.buffered.start(i) > srcTag.currentTime) {
                        bufferedstart = ((srcTag.buffered.start(i) / srcTag.duration) * 100);
                    } else {
                        bufferedstart = ((srcTag.currentTime / srcTag.duration) * 100);
                    }
                    bg += ', rgba(217, 237, 247, 0) ' + bufferedstart + '%';
                    bg += ', rgba(217, 237, 247, 1) ' + bufferedstart + '%';
                    bg += ', rgba(217, 237, 247, 1) ' + bufferedend + '%';
                    bg += ', rgba(217, 237, 247, 0) ' + bufferedend + '%';
                }
            }
            $(seek).css('background', '-webkit-linear-gradient(left, ' + bg + ')');
            //These may be re-enabled when/if other browsers support the background like webkit
            //$(seek).css('background','-o-linear-gradient(left,  ' + bg + ')');
            //$(seek).css('background','-moz-linear-gradient(left,  ' + bg + ')');
            //$(seek).css('background','-ms-linear-gradient(left,  ' + bg + ')');
            //$(seek).css('background','linear-gradient(to right,  ' + bg + ')');
            $(seek).css('background-color', '#ddd');
        }; // seek.progress

        seek.set = function () {
            $(seek).val(srcTag.currentTime);
            seek.progress();
        };

        seek.slide = function () {
            srcTag.currentTime = $(seek).val();

            $(srcTag).trigger('controlChange');

            seek.progress();
        };

        seek.init = function () {
            $(seek).attr({
                'max': srcTag.duration,
                'step': srcTag.duration / 100
            });
            seek.set();
        };

        seek.reset = function () {
            $(seek).val(0);
            srcTag.currentTime = $(seek).val();
            if (!srcTag.loop) {

                if (srcTag.pause)
                    srcTag.pause();
                else
                    $(srcTag).trigger('pause');

            } else {

                if (srcTag.play)
                    srcTag.play();
                else
                    $(srcTag).trigger('play');

            }

            $(srcTag).trigger('controlChange');
        };

        var seek_wrapper = document.createElement('div');
        $(seek_wrapper).addClass('btn btn-default col-sm-4 hidden-xs');
        $(seek_wrapper).append(seek);

        // bind seek / position slider events
        $(seek).on('change', seek.slide);

        // bind audio element events to trigger seek slider updates
        var jqSrcTag = $(srcTag);
        jqSrcTag.on('timeupdate', seek.init);
        jqSrcTag.on('loadedmetadata', seek.init);
        jqSrcTag.on('loadeddata', seek.init);
        jqSrcTag.on('progress', seek.init);
        jqSrcTag.on('canplay', seek.init);
        jqSrcTag.on('canplaythrough', seek.init);
        jqSrcTag.on('ended', seek.reset);
        if (srcTag.readyState > 0) {
            seek.init();
        }

        $(player).append(seek_wrapper);
    } // addSeek

    function addTime(srcTag, player) {
        var time = document.createElement('button');
        $(time).addClass('btn btn-default col-sm-3');
        $(time).tooltip({'container': 'body', 'placement': 'right', 'html': true});

        time.twodigit = function (myNum) {
            return ('0' + myNum).slice(-2);
        }; // time.twodigit

        time.timesplit = function (a) {
            if (isNaN(a)) {
                return '<i class="glyphicon glyphicon-refresh spin"></i>';
            }
            var hours = Math.floor(a / 3600);
            var minutes = Math.floor(a / 60) - (hours * 60);
            var seconds = Math.floor(a) - (hours * 3600) - (minutes * 60);
            var timeStr = time.twodigit(minutes) + ':' + time.twodigit(seconds);
            if (hours > 0) {
                timeStr = hours + ':' + timeStr;
            }
            return timeStr;
        }; // time.timesplit

        time.showtime = function () {
            var position_title = 'Click to Reset<hr style="padding:0; margin:0;" />Position: ';
            var length_title = 'Click to Reset<hr style="padding:0; margin:0;" />Length: ';
            if (!srcTag.paused) {
                $(time).html(time.timesplit(srcTag.currentTime));
                $(time).attr({'title': length_title + (time.timesplit(srcTag.duration))});
            } else {
                $(time).html(time.timesplit(srcTag.duration));
                $(time).attr({'title': position_title  + (time.timesplit(srcTag.currentTime))});
            }
            $(time).tooltip('fixTitle');
        }; // time.showtime

        $(time).click(function () {
            if (srcTag.pause)
                srcTag.pause();
            else
                $(srcTag).trigger('pause');

            srcTag.currentTime = 0;

            $(srcTag).trigger('controlChange');

            time.showtime();
            $(time).tooltip('fixTitle');
            $(time).tooltip('show');
        }); // time.click

        $(time).tooltip('show');
        $(srcTag).on('loadedmetadata', time.showtime);
        $(srcTag).on('loadeddata', time.showtime);
        $(srcTag).on('progress', time.showtime);
        $(srcTag).on('canplay', time.showtime);
        $(srcTag).on('canplaythrough', time.showtime);
        $(srcTag).on('timeupdate', time.showtime);
        if (srcTag.readyState > 0) {
            time.showtime();
        } else {
            $(time).html('<i class="glyphicon glyphicon-refresh spin"></i>');
        }
        $(player).append(time);
    } // addTime

    function addMute(srcTag, player) {
        var mute = document.createElement('button');
        $(mute).addClass('btn btn-default  col-sm-1');

        mute.checkVolume = function () {
            if (srcTag.volume > 0.5 && !srcTag.muted) {
                $(mute).html('<i class="glyphicon glyphicon-volume-up"></i>');
            } else if (srcTag.volume < 0.5 && srcTag.volume > 0 && !srcTag.muted) {
                $(mute).html('<i class="glyphicon glyphicon-volume-down"></i>');
            } else {
                $(mute).html('<i class="glyphicon glyphicon-volume-off"></i>');
            }
        }; // mute.checkVolume

        $(mute).click( function () {
            if (srcTag.muted) {
                srcTag.muted = false;
                srcTag.volume = srcTag.oldvolume;
            } else {
                srcTag.muted = true;
                srcTag.oldvolume = srcTag.volume;
                srcTag.volume = 0;
            }
            $(srcTag).trigger('controlChange');
            mute.checkVolume();
        }); // mute.click(

        mute.checkVolume();
        $(srcTag).on('volumechange', mute.checkVolume);
        $(player).append(mute);
    } // addMute

    function addVolume(srcTag, player) {
        var volume = document.createElement('input');
        $(volume).attr({
            'type': 'range',
            'min': 0,
            'max': 1,
            'step': 1 / 100,
            'value': 1
        });

        volume.slide = function () {
            srcTag.muted = false;
            srcTag.volume = $(volume).val();
            $(srcTag).trigger('controlChange');
        }; // volume.slide

        volume.set = function () {
            $(volume).val(srcTag.volume);
        };

        var vol_wrapper = document.createElement('div');
        $(vol_wrapper).addClass('btn  btn-default  row col-sm-3  hidden-xs');
        $(vol_wrapper).append(volume);
        $(volume).on('change', volume.slide);
        $(srcTag).on('volumechange', volume.set);
        $(player).append(vol_wrapper);

    } // addVolume

    function addAlbumArt(srcTag, data_sec) {
        var albumArt = document.createElement('img');
        $(albumArt).addClass('thumbnail');
        $(albumArt).attr('src', $(srcTag).data('infoAlbumArt'));
        $(data_sec).append(albumArt);
    } // addAlbumArt

    function addInfo(srcTag, title, dataId, data_table) {
        var row = document.createElement('tr');
        var head = document.createElement('th');
        var data = document.createElement('td');
        $(head).html(title);
        $(data).html($(srcTag).data(dataId));
        $(row).append(head);
        $(row).append(data);
        $(data_table).append(row);
    } // addInfo

    function addData(srcTag, player_box, data_sec, data_table, toggle_holder) {
        // jslint will complain about our use of `typeof` but
        // it's the only way not to raise an error by referencing
        // a nnon-existent data-* variable
        var jqSrcTag = $(srcTag);
        if (typeof (jqSrcTag.data('infoAlbumArt')) !== 'undefined') {
            addAlbumArt(srcTag, data_sec);
        }
        if (typeof (jqSrcTag.data('infoArtist')) !== 'undefined') {
            addInfo(srcTag, 'Artist', 'infoArtist', data_table);
        }
        if (typeof (jqSrcTag.data('infoTitle')) !== 'undefined') {
            addInfo(srcTag, 'Title', 'infoTitle', data_table);
        }
        if (typeof (jqSrcTag.data('infoAlbumTitle')) !== 'undefined') {
            addInfo(srcTag, 'Album', 'infoAlbumTitle', data_table);
        }
        if (typeof (jqSrcTag.data('infoLabel')) !== 'undefined') {
            addInfo(srcTag, 'Label', 'infoLabel', data_table);
        }
        if (typeof (jqSrcTag.data('infoYear')) !== 'undefined') {
            addInfo(srcTag, 'Year', 'infoYear', data_table);
        }
        if ($(data_table).html() !== '') {
            $(data_sec).append(data_table);
            // Add Toggle button and Data section.
            $(player_box).prepend(data_sec);
            $(player_box).prepend(toggle_holder);
        }
    } // addData

    function addPlayer(player_box, srcTag, player) {
        if ($(srcTag).data('play') !== 'off') {
            addPlayBtn(srcTag, player);
        }
        if ($(srcTag).data('seek') !== 'off') {
            addSeek(srcTag, player);
        }
        if ($(srcTag).data('time') !== 'off') {
            addTime(srcTag, player);
        }
        if ($(srcTag).data('mute') !== 'off') {
            addMute(srcTag, player);
        }
        if ($(srcTag).data('volume') !== 'off') {
            addVolume(srcTag, player);
        }
        $(player_box).append(player);
    } // addPlayer

    function addAttribution(srcTag, player_box) {
        var attribution = document.createElement('div');
        $(attribution).addClass('row col-sm-10 col-sm-offset-1');
        if (typeof ($(srcTag).data('infoAttLink')) !== 'undefined') {
            var attribution_link = document.createElement('a');
            $(attribution_link).addClass('text-muted btn btn-link btn-sm');
            $(attribution_link).attr('href', $(srcTag).data('infoAttLink'));
            $(attribution_link).html($(srcTag).data('infoAtt'));
            $(attribution).append(attribution_link);
        } else {
            $(attribution).html($(srcTag).data('infoAtt'));
        }
        $(player_box).append(attribution);
    } // addAttribution

    function fillPlayerBox(srcTag, player_box, player, data_sec, data_table, toggle_holder) {
        addData(srcTag, player_box, data_sec, data_table, toggle_holder);

        addPlayer(player_box, srcTag, player);

        if (typeof ($(srcTag).data('infoAtt')) !== 'undefined') {
            addAttribution(srcTag, player_box);
        }
    } // fillPlayerBox

    function recreatePlayerBoxData(srcTag, player_box, data_sec, data_table, toggle_holder) {
        // Check if was collapsed.
        var isCollapsed = ! $(data_sec).hasClass('in');

        // Remove old content.
        $('.playa-data-sec').remove();
        $('.playa-toggle-holder').detach();

        // Create the Metadata/Info section.
        data_sec = document.createElement('section');
        $(data_sec).addClass('playa-data-sec center-block row col-sm-12');
        $(data_sec).addClass(isCollapsed ? 'collapse':'collapse in');
        // Metadata/Info table.
        data_table = document.createElement('table');
        $(data_table).addClass('table table-condensed');

        // Set the button toggle the new data_sec.
        $(toggle_holder).children().first().click(function () {$(data_sec).collapse('toggle'); });


        addData(srcTag, player_box, data_sec, data_table, toggle_holder);

        if (typeof ($(srcTag).data('infoAtt')) !== 'undefined') {
            addAttribution(srcTag, player_box);
        }
    } // recreatePlayerBoxData

})(jQuery);
