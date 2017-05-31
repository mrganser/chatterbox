function toggleToolbar() {
  if (document.querySelector('#toolbar').style.visibility !== 'visible'){
    document.querySelector('#toolbar').style.visibility = 'visible';
    document.querySelector('#toolbar').style.opacity = 0.6;
    setTimeout(function() {
      document.querySelector('#toolbar').style.removeProperty('opacity');
      document.querySelector('#toolbar').style.removeProperty('visibility');
    }, 3000);
  }
}
function toggleVideo(){
  var localStream = currentRoom.getLocalStream();
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !(localStream.getVideoTracks()[0].enabled);
    if (toggleTo) {
      document.querySelector('#cameraIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#cameraIconBan').style.visibility = 'inherit';
    }
    localStream.getVideoTracks()[0].enabled = toggleTo;
  }
}
function toggleAudio(){
  var localStream = currentRoom.getLocalStream();
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !(localStream.getAudioTracks()[0].enabled);
    if (toggleTo) {
      document.querySelector('#muteIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#muteIconBan').style.visibility = 'inherit';
    }
    localStream.getAudioTracks()[0].enabled = toggleTo;
  }
}
function copyLinkToClipboard() {
  document.querySelector('#urlToCopy').select();
  document.execCommand('copy');
}

function toggleFullScreen() {
	var element;
	var requestMethod;

	var isInFullScreen = document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || document.msIsFullScreen;
	if (!isInFullScreen) {
		element = document.documentElement;
		requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen || element.msRequestFullScreen;
	} else {
		element = document;
		requestMethod = element.cancelFullScreen || element.webkitCancelFullScreen || element.mozCancelFullScreen || element.msCancelFullscreen || element.msCancelFullScreen;
	}

	if (requestMethod) {
		requestMethod.call(element);
	}
}

document.addEventListener('fullscreenchange', onFullScreenChange);
document.addEventListener('webkitfullscreenchange', onFullScreenChange);
document.addEventListener('mozfullscreenchange', onFullScreenChange);
function onFullScreenChange() {
	var isInFullScreen = document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || document.msIsFullScreen;
  if (isInFullScreen) {
    document.querySelector('#fullscreenIconBan').style.visibility = 'inherit';
  } else {
    document.querySelector('#fullscreenIconBan').style.visibility = 'hidden';
  }
}
