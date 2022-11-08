'use strict';

var currentRoom;

document.getElementById('joinRoom').addEventListener('click', joinRoom);

function joinRoom() {
  document.querySelector('#precallActions').style.display = 'none';
  document.querySelector('#helperMessage').style.display = 'block';
  currentRoom = new RoomController();
  currentRoom.init();
}

function RoomController() {
  //Public STUN server by Google
  var pc_config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  //Required for interoperating between Chrome and Firefox
  var pc_constraints = { optional: [{ DtlsSrtpKeyAgreement: true }] };
  var socket = io();

  var audioContext;
  var peerConnections = {}; //Store peer connections by socket id
  var remoteStreams = {}; //Store remote streams by socket id
  var mainRemoteStream; //Represents the peer at fullscreen
  var localStream; //Our own local stream

  function getLocalVideoChat() {
    if (!window.RTCPeerConnection || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-frown fa-lg');
      document.querySelector('#helperMessageText').innerHTML =
        'Sorry, your web browser is incompatible. <br /> We recommend using Chrome or Firefox';
      return;
    }

    return navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  }

  function getPeerConnection(id) {
    if (peerConnections[id]) {
      return peerConnections[id];
    }

    var peerConnection = new RTCPeerConnection(pc_config, pc_constraints);
    peerConnection.addStream(localStream);

    //ontrack is called twice (audio track and video track)
    peerConnection.ontrack = function (event) {
      //Avoid adding the stream twice
      if (!remoteStreams[id]) {
        var video = document.createElement('video');
        video.setAttribute('autoplay', 'true');
        video.className = 'memberVideo';
        video.srcObject = event.streams[0];
        var wrapper = document.createElement('div');
        wrapper.className = 'memberVideoWrapper';
        wrapper.id = id;
        wrapper.appendChild(video);
        document.querySelector('#allVideosContainer').appendChild(wrapper);
        if (!audioContext) {
          audioContext = new AudioContext();
        }
        remoteStreams[id] = new RemoteStream(id, event.streams[0], audioContext);
        putStreamSpeakingOnMainVideo();
      }
    };
    peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
        socket.emit('message', { ice: event.candidate, to: id });
      }
    };
    peerConnections[id] = peerConnection;
    return peerConnection;
  }

  function makeNavbarTransparent() {
    document.querySelector('#appHeader').className += ' transparentNavbar';
  }

  function putStreamSpeakingOnMainVideo() {
    var streamSpeaking;
    var videoContainer = document.querySelector('#mainVideoContainer');
    var videoElement = document.querySelector('#mainVideo');
    for (var id in remoteStreams) {
      if (!streamSpeaking || streamSpeaking.instant < remoteStreams[id].instant) {
        streamSpeaking = remoteStreams[id];
      }
    }
    if (!streamSpeaking) {
      videoContainer.style.opacity = 0;
      videoElement.srcObject = null;
      return;
    }
    if (!mainRemoteStream || streamSpeaking.id !== mainRemoteStream.id) {
      mainRemoteStream = streamSpeaking;
      //Clone existing main video and replace it with the new one after a timeout, needed to change smoothly
      var videoSpeaking = videoElement.cloneNode();
      videoSpeaking.id = 'newMainVideo';
      videoSpeaking.srcObject = streamSpeaking.stream;
      var videoContainer = document.querySelector('#mainVideoContainer');
      videoContainer.appendChild(videoSpeaking);
      setTimeout(function () {
        videoContainer.removeChild(videoElement);
        videoSpeaking.id = 'mainVideo';
        videoContainer.style.opacity = 1;
      }, 400);
    }
  }

  this.getLocalStream = function () {
    return localStream;
  };

  this.init = function () {
    var localUserMedia = getLocalVideoChat();
    if (localUserMedia) {
      localUserMedia.then(
        function (stream) {
          if (stream) {
            var localVideo = document.querySelector('#localVideo');
            localStream = stream;
            localVideo.srcObject = stream;
            document.querySelector('#allVideosContainer').style.visibility = 'visible';
            document.querySelector('#overlay').style.display = 'block';
            document.querySelector('#localVideoToolbar').style.visibility = 'visible';
            makeNavbarTransparent();
            socket.emit('createJoin', document.querySelector('#roomName').value);
          }
        },
        function (error) {
          switch (error.name) {
            case 'NotAllowedError':
              document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-arrow-up fa-lg');
              document.querySelector('#helperMessageText').innerHTML =
                'You must allow camera permission to enter the room';
              break;
            case 'NotReadableError':
              document.querySelector('#helperMessageIcon').setAttribute('class', 'far fa-window-restore fa-lg');
              document.querySelector('#helperMessageText').innerHTML =
                'Another browser/app is already accessing your camera';
              break;
            case 'NotFoundError':
              document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-video fa-lg');
              document.querySelector('#helperMessageText').innerHTML =
                'You need to connect a camera. Refresh your browser when ready';
              break;
            case 'NotSupportedError':
              document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-lock fa-lg');
              document.querySelector('#helperMessageText').innerHTML = 'Make sure you are using HTTPS';
              break;
            default:
              document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-frown fa-lg');
              document.querySelector('#helperMessageText').innerHTML = 'Unexpected error. Try again';
              break;
          }
        }
      );
    }

    //Websocket API
    socket.on('fullRoom', function () {
      document.querySelector('#helperMessageIcon').setAttribute('class', 'fa fa-ban fa-lg');
      document.querySelector('#helperMessageText').innerHTML = 'This room is already full';
    });

    socket.on('message', function (data) {
      var peerConnection = getPeerConnection(data.id);
      if (data.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(function () {
          console.log('Setting remote description by offer');
          peerConnection.createAnswer().then(function (sdp) {
            peerConnection.setLocalDescription(sdp);
            socket.emit('message', { to: data.id, sdpAnswer: sdp });
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
      console.log('Joined room: ' + room);
      //When enter room, check who should be on main fullscreen video each 5 seconds
      setInterval(putStreamSpeakingOnMainVideo, 5000);
    });

    socket.on('userJoined', function (user) {
      console.log('User : ' + user.id + ' joined this room');
      var peerConnection = getPeerConnection(user.id);
      peerConnection.createOffer(
        function (sdp) {
          peerConnection.setLocalDescription(sdp);
          socket.emit('message', { to: user.id, sdp: sdp });
        },
        function (error) {
          console.dir(error);
        }
      );
    });

    socket.on('leave', function (user) {
      console.log('User : ' + user.id + ' left this room');
      delete peerConnections[user.id];
      if (remoteStreams[user.id]) {
        remoteStreams[user.id].disconnect();
      }
      delete remoteStreams[user.id];
      var videoElement = document.getElementById(user.id);
      if (videoElement) {
        document.querySelector('#allVideosContainer').removeChild(videoElement);
      }
      putStreamSpeakingOnMainVideo();
    });
  };
}
