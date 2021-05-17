<template>
  <div class="video">
    <div class="video__partner">
        <Video
          videoId="remoteVideo"
          :displayControls="true"
          :videoStream="remoteStream"
          :pauseVideo="pauseVideo"
          :pauseAudio="pauseAudio"
          :muted="false">
        </Video>
    </div>
    <video id="localVideo" class="video__myself" autoplay="true" muted="muted"></video>
  </div>
</template>


<script>
import {WS_EVENTS} from '../utils/config'
import { videoConfiguration } from './../mixins/WebRTC'
import Video from './video/Video'
import { FACE } from './../mixins/face';

export default {
  name: "VideoArea",
  props: {
    room: String,
    to: String,
    videoAnswer: Object
  },
  mixins:[videoConfiguration],
  components: { Video },
  data: () => ({
    // Media config
    constraints: {
      video: {
        width: 450,
        height: 348
      }
    },
    // Peer connection
    pc: undefined,
    remoteStream: undefined,
    remoteVideo: {},
  }),
  async created() {
    // Get user media
    await this.getUserMedia()
    await this.getAudioVideo()
    // Create peer connection and add local stream
    this.createPeerConnection()
    this.addLocalStream(this.pc)
    // Event listeners
    this.onIceCandidates(this.pc, this.to, this.room)
    this.onAddStream()
    // Handlers
    !this.videoAnswer.video
      ? this.createOffer(this.pc, this.to, this.room) // Caller
      : this.handleAnswer(this.videoAnswer.remoteDesc, this.pc, this.videoAnswer.from, this.room) // Callee

    const videoDiv = document.getElementById('remoteVideo')
    const canvasDiv = document.getElementById('remoteCanvas')
    const canvasCtx = canvasDiv.getContext('2d')
    this.start(videoDiv, canvasDiv, canvasCtx, 2)

  },
  mounted() {
    this.myVideo = document.getElementById("localVideo")
    this.remoteVideo = document.getElementById("remoteVideo")
  },
  beforeDestroy() {
    this.pc.close()
    this.pc = null
    this.$socket.emit(WS_EVENTS.privateMessagePCSignaling, {
      to: this.to,
      from: this.$store.state.username,
      room: this.room
    })
  },
  methods: {
    createPeerConnection() {
      this.pc = new RTCPeerConnection(this.configuration)
    },
    onAddStream() {
      this.pc.onaddstream = event => {
        if (!this.remoteVideo.srcObject && event.stream) {
          this.remoteStream = event.stream
          this.remoteVideo.srcObject = this.remoteStream
        }
      }
    },
    start (videoDiv, canvasDiv, canvasCtx, fps) {
      console.log('XXX Conference start() called');
      const self = this
      if (self.interval) {
        clearInterval(self.interval)
      }
      self.interval = setInterval(async () => {
        console.log('XXX Conference drawImage called');

        canvasCtx.drawImage(videoDiv, 0, 0, 320, 247) // FIXME get right dims
        const options = {
          //detectionsEnabled: self.withOptions.find(o => o === 0) === 0,
          landmarksEnabled: true,
          descriptorsEnabled: true,
          expressionsEnabled: true,
        }
        const detections = await FACE.getFaceDetections({canvas: canvasDiv, options})
        if (detections.length) {
          detections.forEach(async (detection) => {
            FACE.draw(
                {
                  canvasDiv,
                  canvasCtx,
                  detection,
                  options
                })
          })
        }
      }, 1000 / fps)
    }
  },
  watch: {
    videoAnswer: function(newVal, oldVal) {
      const desc = newVal.remoteDesc
      const candidate = newVal.candidate
      if (!!desc && desc !== oldVal.remoteDesc) {
        this.setRemoteDescription(desc, this.pc)
      }
      if (!!candidate && candidate !== oldVal.candidate) {
        this.addCandidate(this.pc, candidate)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.video {
  position: relative;
  height: 100%;
  &__partner {
    height: 100%;
    background-color: #353535;
  }
  &__myself {
    border: 1px solid #8e8e8e;
    bottom: 0;
    position: absolute;
    float: right;
    width: 130px;
    right: 0;
    height: 100px;
    z-index: 2;
  }
  &__spinner {
    width: 100% !important;
    height: 100% !important;
  }
}
</style>

