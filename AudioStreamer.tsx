import AudioSource, { StartFn } from "./AudioSource";

export interface DurationSpan {
  begin: number;
  end: number;
}

export default class AudioStreamer {
  scheduleAudiosQueue: Array<StartFn>;
  streamingSourceNode: Array<AudioSource>;
  isPlaying: boolean;
  _durationSpans: Array<DurationSpan>;
  _scheduleAt: number;
  _endedSourceNodeCount: number;
  _context: AudioContext;
  // to avoid _PARTIALLY_ race condition in the case where 'addBuffer' is called twice at the same time
  _awaitedSchedulePromise: Promise<void>;

  constructor() {
    this.scheduleAudiosQueue = [];
    this.streamingSourceNode = [];
    this._durationSpans = [];
    this.isPlaying = false;
    this._scheduleAt = 0;
    this._context = new AudioContext();
    this._awaitedSchedulePromise = Promise.resolve();
    this._endedSourceNodeCount = 0;
  }

  private endSourceNode() {
    this._endedSourceNodeCount++;
    if (this.scheduleAudiosQueue.length === this._endedSourceNodeCount) {
      this.isPlaying = false;
    }
  }

  private doLoop(offset: number, ...startCallbackQueue: Array<StartFn>) {
    let cb = startCallbackQueue.shift();
    while (cb != null) {
      this._scheduleAt = cb(this._scheduleAt, offset);
      offset = 0;
      cb = startCallbackQueue.shift();
    }
  }

  get totalDuration() {
    return this._durationSpans.length ? this._durationSpans.at(-1).end : 0;
  }

  addBuffer(arraybuffer: ArrayBuffer) {
    // ensure previous promise is settled (.then()), wrapping the previous promise with this one
    return (this._awaitedSchedulePromise = this._awaitedSchedulePromise.then(
      async () => {
        const audioBuffer = await this._context.decodeAudioData(arraybuffer);
        const source = new AudioSource(this._context, audioBuffer);
        this._addDurationSpan(audioBuffer.duration);
        source.onended = () => {
          this.endSourceNode();
        };

        const startFn: StartFn = (when, offset) => source.start(when, offset);

        if (this.isPlaying) {
          this.doLoop(0, startFn);
        }

        this.scheduleAudiosQueue.push(startFn);
        this.streamingSourceNode.push(source);
      }
    ));
  }

  _addDurationSpan(duration: number) {
    let begin = this._durationSpans.at(-1)?.end ?? 0;
    this._durationSpans.push({
      begin,
      end: begin + duration,
    });
  }

  // FIXME: doLoop should handle the case where a 'audioSource' starts at specific time
  seekAt(percent: number) {
    const time = (this.totalDuration * percent) / 100;
    const durationSpan = this._getCurrentDurationSpan(time);
    this.reset();
    this._scheduleAt = this._context.currentTime;
    this._endedSourceNodeCount = durationSpan.index;
    this.isPlaying = true;
    this.doLoop(
      durationSpan.time,
      ...this.scheduleAudiosQueue.slice(durationSpan.index)
    );
  }

  private _getCurrentDurationSpan(time: number) {
    const durationSpans = this._durationSpans;
    if (!durationSpans.length ?? time > durationSpans.at(-1).end) {
      throw new Error("Cannot seek to a non-valid position");
    }
    for (let i = 0; i < durationSpans.length; i++) {
      const { begin, end } = durationSpans[i];
      if (time <= end) {
        return { index: i, time: time - begin };
      }
    }
  }

  reset() {
    this._endedSourceNodeCount = 0;
    this.streamingSourceNode.forEach((source) => {
      source.disconnect();
    });
    this.isPlaying = false;
  }

  start() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this._endedSourceNodeCount = 0;
      this._scheduleAt = this._context.currentTime;
      this.doLoop(0, ...this.scheduleAudiosQueue.slice());
    }
  }

  stop() {
    this.reset();
    this.streamingSourceNode.length = 0;
    this.scheduleAudiosQueue.length = 0;
  }
}
