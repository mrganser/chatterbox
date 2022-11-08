'use strict';

//All toolbar functions

//Onclick listeners
document.getElementById('urlToCopy').addEventListener('click', function () {
  this.select();
});
document.getElementById('copyURL').addEventListener('click', copyLinkToClipboard);
document.getElementById('toggleFullScreen').addEventListener('click', toggleFullScreen);
document.getElementById('toggleVideo').addEventListener('click', toggleVideo);
document.getElementById('toggleAudio').addEventListener('click', toggleAudio);

//Show toolbar on focus or touch on mobile
document.querySelector('#overlay').addEventListener('touchend', toggleToolbar);
document.querySelector('#overlay').addEventListener('mouseover', toggleToolbar);
function toggleToolbar() {
  if (document.querySelector('#toolbar').style.visibility !== 'visible') {
    document.querySelector('#toolbar').style.visibility = 'visible';
    document.querySelector('#toolbar').style.opacity = 0.6;
    setTimeout(function () {
      document.querySelector('#toolbar').style.removeProperty('opacity');
      document.querySelector('#toolbar').style.removeProperty('visibility');
    }, 3000);
  }
}
//Button to block/unblock your camera
function toggleVideo() {
  var localStream = currentRoom.getLocalStream();
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !localStream.getVideoTracks()[0].enabled;
    if (toggleTo) {
      document.querySelector('#cameraIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#cameraIconBan').style.visibility = 'inherit';
    }
    localStream.getVideoTracks()[0].enabled = toggleTo;
  }
}
//Button to mute/unmute your audio
function toggleAudio() {
  var localStream = currentRoom.getLocalStream();
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !localStream.getAudioTracks()[0].enabled;
    if (toggleTo) {
      document.querySelector('#muteIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#muteIconBan').style.visibility = 'inherit';
    }
    localStream.getAudioTracks()[0].enabled = toggleTo;
  }
}
//Button on share modal to copy URL for sharing
function copyLinkToClipboard() {
  document.querySelector('#urlToCopy').select();
  document.execCommand('copy');
}
//Button to enter/exit fullscreen
function toggleFullScreen() {
  var element;
  var requestMethod;

  var isInFullScreen =
    document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || document.msIsFullScreen;
  if (!isInFullScreen) {
    element = document.documentElement;
    requestMethod =
      element.requestFullScreen ||
      element.webkitRequestFullScreen ||
      element.mozRequestFullScreen ||
      element.msRequestFullscreen ||
      element.msRequestFullScreen;
  } else {
    element = document;
    requestMethod =
      element.cancelFullScreen ||
      element.webkitCancelFullScreen ||
      element.mozCancelFullScreen ||
      element.msCancelFullscreen ||
      element.msCancelFullScreen;
  }

  if (requestMethod) {
    requestMethod.call(element);
  }
}

//Listeners for showing correctly the fullscreen icon when we enter/exit fullscreen without the button
document.addEventListener('fullscreenchange', onFullScreenChange);
document.addEventListener('webkitfullscreenchange', onFullScreenChange);
document.addEventListener('mozfullscreenchange', onFullScreenChange);
function onFullScreenChange() {
  var isInFullScreen =
    document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || document.msIsFullScreen;
  if (isInFullScreen) {
    document.querySelector('#fullscreenIconBan').style.visibility = 'inherit';
  } else {
    document.querySelector('#fullscreenIconBan').style.visibility = 'hidden';
  }
}
