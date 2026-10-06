document.getElementById("smallTempo").addEventListener("input", e => window.smallStep = +e.target.value);
document.getElementById("mediumTempo").addEventListener("input", e => window.mediumStep = +e.target.value);
document.getElementById("largeTempo").addEventListener("input", e => window.largeStep = +e.target.value);

["small", "medium", "large"].forEach(id => {
  document.getElementById(id + "On").addEventListener("change", e => {
    window[id + "Enabled"] = e.target.checked;
  });
});

function initRecorder() {
  const streamDest = Tone.context.createMediaStreamDestination();
  Tone.Master.connect(streamDest);
  p5.soundOut.output.connect(streamDest);

  const mediaRecorder = new MediaRecorder(streamDest.stream);
  let recordedChunks = [];
  let isRecording = false;

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "music-box-recording.webm";
    a.click();
    URL.revokeObjectURL(url);
    recordedChunks = [];
  };

  document.getElementById("recordButton").addEventListener("click", () => {
    if (!isRecording) {
      recordedChunks = [];
      mediaRecorder.start();
      isRecording = true;
      document.getElementById("recordButton").textContent = "■ Stop & Download";
    } else {
      mediaRecorder.stop();
      isRecording = false;
      document.getElementById("recordButton").textContent = "● Record";
    }
  });
}
window.initRecorder = initRecorder;