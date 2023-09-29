import AudioStreamer from "./AudioStreamer";

const audioStreamer = new AudioStreamer();

const input = document.getElementById("import-file-input");
const startPlaybackButton = document.getElementById("start-playback-button");
const audioList = document.getElementById("audio-list");
const percentControl = document.getElementById("percentage-control");
const totalDurationContainer = document.getElementById("total-duration");

input.onchange = async (e: Record<string, any>) => {
  const files = e.target.files;
  if (files && files.length) {
    const item = files.item(0);
    const buf = await item.arrayBuffer();
    audioStreamer.addBuffer(buf).then(() => {
      totalDurationContainer.textContent = String(audioStreamer.totalDuration);
    });
    e.target.value = "";

    // render inside <body>
    const li = document.createElement("li");
    li.textContent = item.name;
    audioList.appendChild(li);
  }
};

percentControl.addEventListener("change", (e) => {
  const span = audioStreamer.seekAt((e.target as any).value);
  // console.log("span", span);
});

startPlaybackButton.addEventListener("click", () => {
  audioStreamer.start();
});
