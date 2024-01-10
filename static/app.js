// app.js

document.addEventListener('DOMContentLoaded', () => {
    const socket = io.connect('http://' + document.domain + ':' + location.port);
    const videoGrid = document.getElementById('video-grid');
    const localVideo = document.createElement('video');
    localVideo.muted = true;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            addVideoStream(localVideo, stream);

            socket.emit('join-room', ROOM_ID);
            socket.on('user-connected', (userId) => {
                connectToNewUser(userId, stream);
            });

            // Handle incoming video and audio streams from other clients
            socket.on('user-disconnected', (userId) => {
                const videoElement = document.getElementById(userId);
                if (videoElement) {
                    videoElement.remove();
                }
            });
        })
        .catch((error) => {
            console.error('Error accessing webcam:', error);
        });

    // Function to add a new video stream to the video grid
    function addVideoStream(videoElement, stream) {
        videoElement.srcObject = stream;
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play();
        });
        videoGrid.append(videoElement);
    }

    // Function to connect to a new user
    function connectToNewUser(userId, stream) {
        const peer = new SimplePeer({ initiator: true, trickle: false, stream });

        peer.on('signal', (data) => {
            socket.emit('offer', { userId, signalData: data });
        });

        socket.on('answer', (data) => {
            if (data.userId === userId) {
                peer.signal(data.signalData);
            }
        });

        socket.on('ice-candidate', (data) => {
            if (data.userId === userId) {
                peer.signal(data.candidate);
            }
        });

        peer.on('stream', (userStream) => {
            const newUserVideo = document.createElement('video');
            addVideoStream(newUserVideo, userStream);
        });

        peer.on('close', () => {
            const videoElement = document.getElementById(userId);
            if (videoElement) {
                videoElement.remove();
            }
        });
    }

    // Event listeners for toggling audio and video
    document.getElementById('toggleAudio').addEventListener('click', () => {
        const audioEnabled = localVideo.srcObject.getAudioTracks()[0].enabled;
        localVideo.srcObject.getAudioTracks()[0].enabled = !audioEnabled;
    });

    document.getElementById('toggleVideo').addEventListener('click', () => {
        const videoEnabled = localVideo.srcObject.getVideoTracks()[0].enabled;
        localVideo.srcObject.getVideoTracks()[0].enabled = !videoEnabled;
    });
});
