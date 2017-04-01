var socket = io();

var pc_config = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var pc_constraints = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

var localStream;
var peerConnections = {};

$(function () {

  function getLocalVideoChat() {
    if (!window.RTCPeerConnection || !navigator.mediaDevices.getUserMedia) {
      alert('Browser incompatible!');
      return;
    }

    var localVideo = document.querySelector('#localVideo');

    return navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
      localStream = stream;
      localVideo.srcObject = stream;
      return localStream;
    }).catch(function (error) {
      //TODO: Show error message to refresh browser and accept audio/video permissions
      console.log('Error: ', error);
    });
  }

  function handleError(error) {
    console.dir(error);
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
      video.setAttribute('width', '160');
      video.setAttribute('height', '120');
      video.className = 'membersVideo';
      video.srcObject = event.stream;
      video.id = id;
      document.querySelector('#allVideosContainer').appendChild(video);
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
    });

    socket.on('fullRoom', function () {
      console.log('Room is full');
    });

    socket.on('message', function (data) {
      var peerConnection = getPeerConnection(data.id);
      if (data.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp), function() {
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


// Utils
function toggleVideo(){
  localStream.getVideoTracks()[0].enabled = !(localStream.getVideoTracks()[0].enabled);
}
function toggleAudio(){
  localStream.getAudioTracks()[0].enabled = !(localStream.getAudioTracks()[0].enabled);
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
