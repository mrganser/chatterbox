var socket = io();

var pc_config = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var pc_constraints = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

var localStream;

$(function () {
  var localPeerConnection, remotePeerConnection;

  function localVideoChat() {
    //TODO: Check browser compatibility, if not, show error message

    var localVideo = document.querySelector('#localVideo');

    navigator.getUserMedia({ audio: true, video: true }, function (stream) {
      localStream = stream;
      localVideo.srcObject = stream;
    }, function (error) {
      //TODO: Show error message to refresh browser and accept audio/video permissions
      console.log('Error: ', error);
    });
  }

  var callButton = document.querySelector('#call');
  callButton.onclick = call;
  function call() {
    callButton.disabled = true;

    var mainVideo = document.querySelector('#mainVideo');

    function gotRemoteStream(event) {
      mainVideo.srcObject = event.stream;
    }

    function gotLocalIceCandidate(event) {
      if (event.candidate) {
        remotePeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        console.log("Local ICE candidate: \n" + event.candidate.candidate);
      }
    }

    function gotRemoteIceCandidate(event) {
      if (event.candidate) {
        localPeerConnection.addIceCandidate(new RTCIceCandidate(event.candidate));
        console.log("Remote ICE candidate: \n " + event.candidate.candidate);
      }
    }

    function gotRemoteDescription(description) {
      remotePeerConnection.setLocalDescription(description);
      console.log("Answer from remotePeerConnection: \n" + description.sdp);
      localPeerConnection.setRemoteDescription(description);
    }

    function handleError(error) {
      console.dir(error);
    }

    function gotLocalDescription(description) {
      localPeerConnection.setLocalDescription(description);
      console.log("Offer from localPeerConnection: \n" + description.sdp);
      remotePeerConnection.setRemoteDescription(description);
      remotePeerConnection.createAnswer(gotRemoteDescription, handleError);
    }

    function init() {
      var servers = null;

      localPeerConnection = new RTCPeerConnection(servers);
      localPeerConnection.onicecandidate = gotLocalIceCandidate;

      remotePeerConnection = new RTCPeerConnection(servers);
      remotePeerConnection.onicecandidate = gotRemoteIceCandidate;
      remotePeerConnection.onaddstream = gotRemoteStream;

      localPeerConnection.addStream(localStream);
      localPeerConnection.createOffer(gotLocalDescription, handleError);
    }

    init();
  }

  function makeNavbarTransparent(){
    document.querySelector('#appHeader').className += ' transparentNavbar';
  }

  function enterRoom() {
    socket.emit('createJoin', roomName);

    socket.on('fullRoom', function () {
      console.log('Room is full');
    });

    socket.on('joinedRoom', function (room) {
      console.log('Joined room: ', room);
      makeNavbarTransparent();
      localVideoChat();
    });

    socket.on('userJoined', function (socket) {
      console.log('User : ', socket.id + ' joined this room');
    });
  }

  enterRoom();
});


//Utils
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
