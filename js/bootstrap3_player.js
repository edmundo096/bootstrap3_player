/* global jQuery */
(function ($) {
    'use strict';

    // TODO Add modifications to create and control a youtube player, depending the data-source data-source-type.
    // Search the target container to control and lister for.

    // Select the #media-container, and the audio tags that is not inside a #media-container.
    var mediaContainerTag   = $('#media-container');
    var audioTag            = $('audio[controls]:not(#media-container audio[controls])');


    // For #media-container tags, Construct and insert the player box inside the searched elements at the beginning.
    mediaContainerTag.prepend(function() {
        var srcTag = this;

        return processSrc(srcTag);
    });


    // For audio tags, Construct and insert the player box before the searched elements.
	audioTag.before(function() {
        var srcTag = this;

        // Turn off the native audio controls.
        srcTag.controls = false;

        return processSrc(srcTag);
    });


    function processSrc(srcTag) {

        // Create the new player container div.
        var player_box = document.createElement('div');
        $(player_box).addClass($(srcTag).attr('class') + ' well container-fluid playa');


        // Create the Metadata/Info section.
        var data_sec = document.createElement('section');
        $(data_sec).addClass('collapsing center-block row col-sm-12');

        // Create the div that will contain the toggle button.
        var toggle_holder = document.createElement('div');
        $(toggle_holder).addClass('btn-group center-block row col-sm-12');
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

        var data_table = document.createElement('table');
        $(data_table).addClass('table table-condensed');

        // Create the player buttons section.
        var player = document.createElement('section');
        $(player).addClass('btn-group  center-block row  col-sm-12');


        fillPlayerBox(srcTag, player_box, player, data_sec, data_table, toggle_holder);

        $(srcTag).on('error', function () {
            console.log("Error encountered after fillPlayerBox");
            load_error(player_box);
        });
        return player_box;
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

    function addPlay(srcTag, player) {
        var play = document.createElement('button');
        $(play).addClass('btn  btn-default disabled col-sm-1');

        play.setPlayState = function (toggle) {
            $(play).removeClass('disabled');
            if (toggle === 'play') {
                $(play).html('<i class="glyphicon glyphicon-play"></i>');
                $(play).click(function () {
                    srcTag.play();
                });
            }
            if (toggle === 'pause') {
                $(play).html('<i class="glyphicon glyphicon-pause"></i>');
                $(play).click(function () {
                    srcTag.pause();
                });
            }
        }; // setPlayState

        // media events from the audio element will trigger rebuilding the play button
        $(srcTag).on('play', function () {play.setPlayState('pause'); });
        $(srcTag).on('canplay', function () {play.setPlayState('play'); });
        $(srcTag).on('pause', function () {play.setPlayState('play'); });

        var timeout = 0;

        var loadCheck = setInterval(function () {
            if (isNaN(srcTag.duration) === false) {
                play.setPlayState('play');
                clearInterval(loadCheck);
                return true;
            }
            if (srcTag.networkState === 3 || timeout === 100) {
                // 3 = NETWORK_NO_SOURCE - no audio/video source found
                console.log('No audio source was found or a timeout occurred');
                load_error();
                clearInterval(loadCheck);
                return false;
            }
            timeout++;
        }, 100); // x milliseconds per attempt
        $(player).append(play);
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
                srcTag.pause();
            } else {
                srcTag.play();
            }
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
            srcTag.pause();
            srcTag.currentTime = 0;
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
            $(player_box).append(toggle_holder);
            $(player_box).append(data_sec);
        }
    } // addData

    function addPlayer(player_box, srcTag, player) {
        if ($(srcTag).data('play') !== 'off') {
            addPlay(srcTag, player);
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

})(jQuery);
