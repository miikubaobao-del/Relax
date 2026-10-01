const editor = document.getElementById("editor");
const sendButton = document.getElementById("sendButton");
const morphLayer = document.getElementById("textMorphLayer");

let sending = false;

function getText() {
  return editor.innerText.replace(/\u00a0/g, " ").trim();
}

async function collapseAndDrop(text, targetScreen) {
  const rect = editor.getBoundingClientRect();

  const ghost = document.createElement("div");
  ghost.className = "morph-text";
  ghost.textContent = text;
  ghost.style.left = `${rect.left + 30}px`;
  ghost.style.top = `${rect.top + 26}px`;
  ghost.style.width = `${Math.max(30, rect.width - 60)}px`;
  morphLayer.appendChild(ghost);

  await new Promise(requestAnimationFrame);

  const gr = ghost.getBoundingClientRect();
  const cx = gr.left + gr.width / 2;
  const cy = gr.top + gr.height / 2;

  editor.style.opacity = ".08";

  // Stage 1: collapse straight into a small clump. No rotation.
  const collapse = ghost.animate(
    [
      {
        transform: "translate(0,0) scale(1)",
        opacity: 1,
        filter: "blur(0px)"
      },
      {
        transform: "translate(0,0) scale(.06)",
        opacity: .96,
        filter: "blur(.6px)"
      }
    ],
    {
      duration: 390,
      easing: "cubic-bezier(.55,.02,.32,1)",
      fill: "forwards"
    }
  );

  await collapse.finished.catch(() => {});

  const dot = document.createElement("div");
  dot.className = "collapse-dot";
  dot.style.left = `${cx - 11}px`;
  dot.style.top = `${cy - 11}px`;
  morphLayer.appendChild(dot);

  ghost.remove();

  const dx = targetScreen.x - cx;
  const dy = targetScreen.y - cy;

  // Stage 2: the clump simply drops toward the grass.
  const drop = dot.animate(
    [
      {
        transform: "translate(0,0) scale(1)",
        opacity: 1
      },
      {
        offset: .72,
        transform: `translate(${dx * .72}px, ${dy * .68}px) scale(.82)`,
        opacity: 1
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(.7,.82)`,
        opacity: .92
      }
    ],
    {
      duration: 520,
      easing: "cubic-bezier(.30,.02,.58,1)",
      fill: "forwards"
    }
  );

  await drop.finished.catch(() => {});

  dot.remove();
  editor.style.opacity = "1";
}

async function sendText() {
  if (sending || !window.NeverMind3D) return;

  const text = getText();

  if (!text) {
    editor.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 250 }
    );
    return;
  }

  sending = true;
  sendButton.disabled = true;

  const preview = window.NeverMind3D.previewCornPosition();

  await collapseAndDrop(text, preview.screen);

  editor.innerHTML = "";

  window.NeverMind3D.spawnCornAt(
    preview.x,
    preview.z,
    text
  );

  sendButton.disabled = false;
  sending = false;
  editor.focus();
}

sendButton.addEventListener("click", sendText);

editor.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    sendText();
  }
});

editor.focus();
