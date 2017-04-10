var socket = io();

var pc_config = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };

var pc_constraints = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

var localStream;
var peerConnections = {};

$(function () {

  function handleError(error) {
    console.dir(error);
  }

  function getLocalVideoChat() {
    if (!window.RTCPeerConnection || !navigator.mediaDevices.getUserMedia) {
          document.querySelector('#helperMessageIcon').className = 'fa fa-frown-o fa-lg';
          document.querySelector('#helperMessageText').innerHTML = 'Sorry, your web browser is incompatible. <br /> We recommend using Chrome or Firefox';
      return;
    }

    var localVideo = document.querySelector('#localVideo');

    return navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
      localStream = stream;
      localVideo.srcObject = stream;
      return localStream;
    });
  }

  function getPeerConnection(id) {
    if (peerConnections[id]) {
      return peerConnections[id];
    }
    
    //TODO: ontrack, promises
    var peerConnection = new RTCPeerConnection(pc_config, pc_constraints);
    peerConnection.addStream(localStream);

    peerConnection.onaddstream = function (event) {
      var video = document.createElement("video");
      video.setAttribute('autoplay', 'true');
      video.className = 'memberVideo';
      video.srcObject = event.stream;
      var wrapper = document.createElement("div");
      wrapper.className = 'memberVideoWrapper';
      wrapper.id = id;
      wrapper.appendChild(video);
      document.querySelector('#allVideosContainer').appendChild(wrapper);
      //TODO: Put in main the one speaking or the only one
      document.querySelector('#mainVideo').srcObject = event.stream;
    };
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('message', {ice: event.candidate, to: id});
      }
    };
    peerConnections[id] = peerConnection;
    return peerConnection;
  }

  function makeNavbarTransparent() {
    document.querySelector('#appHeader').className += ' transparentNavbar';
  }

  function enterRoom() {
    getLocalVideoChat().then(function(localStream){
      makeNavbarTransparent();
      socket.emit('createJoin', roomName);
    }, function(error) {
      switch(error.name) {
        case 'NotAllowedError':
          document.querySelector('#helperMessageIcon').className = 'fa fa-arrow-up fa-lg';
          document.querySelector('#helperMessageText').innerHTML = 'You must allow camera permission to enter the room';
          break;
        case 'NotReadableError':
          document.querySelector('#helperMessageIcon').className = 'fa fa-window-restore fa-lg';
          document.querySelector('#helperMessageText').innerHTML = 'Another browser/app is already accessing your camera';
          break;
        case 'NotFoundError':
          document.querySelector('#helperMessageIcon').className = 'fa fa-video-camera fa-lg';
          document.querySelector('#helperMessageText').innerHTML = 'You need to have a camera connected';
          break;
        default:
          document.querySelector('#helperMessageIcon').className = 'fa fa-frown-o fa-lg';
          document.querySelector('#helperMessageText').innerHTML = 'Unexpected error. Try again';
          break;
      }
    });

    socket.on('fullRoom', function () {
      document.querySelector('#helperMessageIcon').className = 'fa fa-ban fa-lg';
      document.querySelector('#helperMessageText').innerHTML = 'This room is already full';
    });

    socket.on('message', function (data) {
      var peerConnection = getPeerConnection(data.id);
      if (data.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function() {
          console.log('Setting remote description by offer');
          peerConnection.createAnswer().then(function(sdp) {
            peerConnection.setLocalDescription(sdp);
            socket.emit('message', {to: data.id, sdpAnswer: sdp});
          });
        });
      } else if (data.sdpAnswer) {
        console.log('Setting remote description by answer');
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdpAnswer));
      } else if (data.ice) {
        console.log('Adding ice candidates');
        peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
      }
    });

    socket.on('joinedRoom', function (room) {
      console.log('Joined room: ', room);
    });

    socket.on('userJoined', function (user) {
      console.log('User : ', user.id + ' joined this room');
      var peerConnection = getPeerConnection(user.id);
      peerConnection.createOffer(function (sdp) {
        peerConnection.setLocalDescription(sdp);
        socket.emit('message', {to: user.id, sdp: sdp});
      }, handleError);  
    });

    socket.on('leave', function (user) {
      console.log('User : ', user.id + ' left this room');
      delete peerConnections[user.id];
      document.querySelector('#allVideosContainer').removeChild(document.getElementById(user.id));
    });
  }

  enterRoom();
});


// Toolbar utils
function toggleVideo(){
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !(localStream.getVideoTracks()[0].enabled);
    if (toggleTo) {
      document.querySelector('#cameraIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#cameraIconBan').style.visibility = 'visible';
    }
    localStream.getVideoTracks()[0].enabled = toggleTo;
  }
}
function toggleAudio(){
  if (localStream && localStream.getVideoTracks()[0]) {
    var toggleTo = !(localStream.getAudioTracks()[0].enabled);
    if (toggleTo) {
      document.querySelector('#muteIconBan').style.visibility = 'hidden';
    } else {
      document.querySelector('#muteIconBan').style.visibility = 'visible';
    }
    localStream.getAudioTracks()[0].enabled = toggleTo;
  }
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

	if (requestMethod) { // Native full screen.
		requestMethod.call(element);
	} else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
		var wscript = new ActiveXObject("WScript.Shell");
		if (wscript !== null) {
			wscript.SendKeys("{F11}");
		}
	}
}
function copyLinkToClipboard() {
  //TODO
}
