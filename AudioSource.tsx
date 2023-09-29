export interface StartFn {
  (when?: number, offset?: number): number;
}

export interface StartAudio {
  /**
   * starts at 'when'
   * returns start time + buffer duration
   */
  start: StartFn;
}

export default class AudioSource implements StartAudio {
  _context: AudioContext;
  sourceNode: AudioBufferSourceNode;
  buffer: AudioBuffer;
  onended = () => void 0;

  constructor(audioContext: AudioContext, buffer: AudioBuffer) {
    this._context = audioContext;
    this.buffer = buffer;
  }

  start(when = 0, offset = 0) {
    this.sourceNode && this.disconnect();
    const sourceNode = this._context.createBufferSource();
    sourceNode.onended = this.onended;
    sourceNode.buffer = this.buffer;
    sourceNode.connect(this._context.destination);
    sourceNode.start(when, offset);
    this.sourceNode = sourceNode;
    return when + this.buffer.duration - offset;
  }

  disconnect() {
    this.sourceNode.disconnect();
  }
}
