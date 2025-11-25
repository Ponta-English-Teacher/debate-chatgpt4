// === General OpenAI Chat Request (via backend) ===
// フロントエンドからは /api/chat に投げるだけ。APIキーはサーバー側で管理。
async function callOpenAI(prompt) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    console.error("Error from /api/chat:", await response.text());
    return "Error: Server failed to respond.";
  }

  const data = await response.json(); // { reply: "..." } を想定
  return data.reply || "No response received.";
}

// === Feedback Generator ===
async function generateFeedback(id, type) {
  const text = document.getElementById(id).value;
  if (!text.trim()) {
    alert("Please write something first.");
    return;
  }

  let prompt = "";
  if (type === "opinion") {
    prompt =
      "Help improve this student's debate argument. Focus on clarity, logic, structure, and persuasion. Do not argue yourself. Here is the student's text:\n" +
      text;
  } else {
    prompt =
      "Please correct the grammar and improve clarity of this text. Keep the original meaning. Here is the text:\n" +
      text;
  }

  const result = await callOpenAI(prompt);
  const box = document.getElementById(id + "Feedback");
  box.innerText = result;
  box.style.display = "block";
}

// === Counterargument Generator ===
async function generateChatGPTCounterargument() {
  const opinion = document.getElementById("mainArgument").value;
  if (!opinion.trim()) {
    alert("Please write your main argument first.");
    return;
  }

  const prompt =
    "Act as an opponent in a debate. Present a logical, polite counterargument in English to this opinion:\n" +
    opinion;

  const result = await callOpenAI(prompt);
  const box = document.getElementById("counterargumentBox");
  box.innerText = result;
  box.style.display = "block";
}

// === Final Evaluation ===
async function generateEvaluation() {
  const ids = ["mainArgument", "rebuttal", "conclusion"];
  const allInputs = ids
    .map((id) => `${id}: ${document.getElementById(id).value}`)
    .join("\n");

  const prompt =
    "Evaluate the following student debate performance. Include: (1) a short summary, (2) strengths, and (3) weaknesses, in clear English for a learner:\n" +
    allInputs;

  const result = await callOpenAI(prompt);
  const box = document.getElementById("evaluationBox");
  box.innerText = result;
  box.style.display = "block";
}

// === Save as Editable HTML ===
function saveDataAsEditableHTML() {
  const mainContent = document.body.innerHTML;

  const styledHTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Saved Debate Sheet</title>
    <style>
      body {
        font-family: 'Arial Rounded MT Bold', sans-serif;
        background-color: #ffffff;
        color: #333;
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        line-height: 1.6;
      }
      h1, h2 {
        color: #0056b3;
      }
      textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 1.1em;
        background-color: #f9f9f9;
        margin-bottom: 10px;
      }
      .feedback-box, .glossary-box {
        border: 1px solid #ccc;
        background-color: #f5f5f5;
        padding: 12px;
        margin-top: 10px;
        white-space: pre-wrap;
      }
      ul {
        padding-left: 20px;
      }
    </style>
  </head>
  <body>
    ${mainContent}
  </body>
  </html>`;

  const blob = new Blob([styledHTML], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "debate_practice.html";
  link.click();
}

// === Dictionary Popup ===
let cachedAudioUrl = null;
let audioPlayer = null;

async function showDictionaryPopup() {
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) {
    alert("Please select text to look up.");
    return;
  }

  const prompt =
    `Explain the English word or phrase "${selectedText}" in simple, learner-friendly English,` +
    ` and also provide a natural Japanese equivalent. Keep it short and clear.`;
  const meaning = await callOpenAI(prompt);

  const popup = document.getElementById("dictionary-popup");
  document.getElementById("popup-meaning").innerText =
    `Selected: ${selectedText}\n\n` + meaning;
  popup.style.display = "block";

  // TTS caching and replay
  cachedAudioUrl = null;
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }

  document.getElementById("popup-play").onclick = async () => {
    if (!cachedAudioUrl) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: selectedText,
          voice: "nova"
        })
      });

      if (!res.ok) {
        console.error("Error from /api/tts:", await res.text());
        alert("Audio could not be generated.");
        return;
      }

      const blob = await res.blob();
      cachedAudioUrl = URL.createObjectURL(blob);
    }

    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    }

    audioPlayer = new Audio(cachedAudioUrl);
    audioPlayer.play();
  };

  document.getElementById("popup-add").onclick = () => {
    const glossary = document.getElementById("summary-content");
    const li = document.createElement("li");
    li.textContent = `${selectedText}: ${meaning}`;
    glossary.appendChild(li);
  };
}

// === Close Button ===
document.getElementById("popup-close").addEventListener("click", () => {
  document.getElementById("dictionary-popup").style.display = "none";
  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }
});

// === Draggable Dictionary Popup ===
const popup = document.getElementById("dictionary-popup");
let isDragging = false;
let offsetX = 0;
let offsetY = 0;

popup.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.offsetX;
  offsetY = e.offsetY;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    popup.style.left = `${e.pageX - offsetX}px`;
    popup.style.top = `${e.pageY - offsetY}px`;
  }
});
