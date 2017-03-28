var socket = io();

var pc_config = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }] };

var pc_constraints = { 'optional': [{ 'DtlsSrtpKeyAgreement': true }] };

$(function () {
  var localStream, localPeerConnection, remotePeerConnection;

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

  function enterRoom() {
    socket.emit('createJoin', roomName);

    socket.on('fullRoom', function () {
      console.log('Room is full');
    });

    socket.on('joinedRoom', function (room) {
      console.log('Joined room: ', room);
      localVideoChat();
    });

    socket.on('userJoined', function (socket) {
      console.log('User : ', socket.id + ' joined this room');
    });
  }

  enterRoom();
});
