/* eslint-disable */

import * as faceapi from 'face-api.js'

export const FACE = {
  state: {
    faces: [],
    loading: false,
    loaded: false,
    faceMatcher: null,

    useTiny: false,

    detections: {
      scoreThreshold: 0.5,
      inputSize: 320,
      boxColor: 'blue',
      textColor: 'red',
      lineWidth: 1,
      fontSize: 20,
      fontStyle: 'Georgia'
    },
    expressions: {
      minConfidence: 0.2
    },
    landmarks: {
      drawLines: true,
      lineWidth: 1
    },
    descriptors: {
      withDistance: false
    }
  },

  mutations: {
    loading(state) {
      state.loading = true
    },

    load(state) {
      state.loading = false
      state.loaded = true
    },

    setFaces(state, faces) {
      state.faces = faces
    },

    setFaceMatcher(state, matcher) {
      state.faceMatcher = matcher
    }
  },
  load() {
    console.log('XXX face.js load() called with state', this.state);
    if (!this.state.loading && !this.state.loaded) {
      //commit('loading')
      return Promise.all([
        faceapi.loadFaceRecognitionModel('/data/models'),
        faceapi.loadFaceLandmarkModel('/data/models'),
        faceapi.loadTinyFaceDetectorModel('/data/models'),
        faceapi.loadFaceExpressionModel('/data/models')
      ])
        .then(() => {
          this.state.loaded = true;
          console.log('loaded models')
          //commit('load')
        })
        .catch((err) => {
          console.log('ERROR loading faceapi', err);
        })
    }
  },
  async getFaceDetections({canvas, options}) {
    this.load();
    console.log('XXX face:getFaceDetections called');
    let detections = faceapi
      .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
        scoreThreshold: this.state.detections.scoreThreshold,
        inputSize: this.state.detections.inputSize
      }))

    if (options && (options.landmarksEnabled || options.descriptorsEnabled)) {
      detections = detections.withFaceLandmarks(this.state.useTiny)
    }
    if (options && options.expressionsEnabled) {
      detections = detections.withFaceExpressions()
    }
    if (options && options.descriptorsEnabled) {
      detections = detections.withFaceDescriptors()
    }
    detections = await detections
    return detections
  },
  draw({canvasDiv, canvasCtx, detection, options}) {
    let emotions = ''
    // filter only emotions above confidence treshold and exclude 'neutral'
    if (options.expressionsEnabled && detection.expressions) {
      for (const expr in detection.expressions) {
        if (detection.expressions[expr] > this.state.expressions.minConfidence && expr !== 'neutral') {
          emotions += ` ${expr} &`
        }
      }
      if (emotions.length) {
        emotions = emotions.substring(0, emotions.length - 2)
      }
    }
    let name = ''
    if (options.descriptorsEnabled && detection.recognition) {
      name = detection.recognition.toString(this.state.descriptors.withDistance)
    }

    const text = `${name}${emotions ? (name ? ' is ' : '') : ''}${emotions}`
    const box = detection.box || detection.detection.box
    if (box) {
      // draw box
      canvasCtx.strokeStyle = this.state.detections.boxColor
      canvasCtx.lineWidth = this.state.detections.lineWidth
      canvasCtx.strokeRect(box.x, box.y, box.width, box.height)
    }
    if (text && detection && box) {
      // draw text
      const padText = 2 + this.state.detections.lineWidth
      canvasCtx.fillStyle = this.state.detections.textColor
      canvasCtx.font = this.state.detections.fontSize + 'px ' + this.state.detections.fontStyle
      canvasCtx.fillText(text, box.x + padText, box.y + box.height + padText + (this.state.detections.fontSize * 0.6))
    }

    if (options.landmarksEnabled && detection.landmarks) {
      faceapi.draw.drawFaceLandmarks(canvasDiv, detection.landmarks, {
        lineWidth: this.state.landmarks.lineWidth,
        drawLines: this.state.landmarks.drawLines
      })
    }
  },

  async createCanvas({commit, state}, elementId) {
    const canvas = await faceapi.createCanvasFromMedia(document.getElementById(elementId))
    return canvas
  }
};
