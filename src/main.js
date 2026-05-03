import Phaser from "phaser";
import { chooseEnemyAction, describeEnemyMood } from "./ai.js";
import {
  ACTION_ORDER,
  ACTIONS,
  MAX_QI,
  createInitialState,
  getLegalActions,
  resolveRound
} from "./rules.js";
import "./styles.css";

const dom = {
  actionButtons: document.querySelector("#action-buttons"),
  beatText: document.querySelector("#beat-text"),
  enemyRead: document.querySelector("#enemy-read"),
  enemyQi: document.querySelector("#enemy-qi"),
  enemyScore: document.querySelector("#enemy-score"),
  playerQi: document.querySelector("#player-qi"),
  playerScore: document.querySelector("#player-score"),
  resetButton: document.querySelector("#reset-button"),
  roundLog: document.querySelector("#round-log")
};

let state = createInitialState();
let history = [];
let resolving = false;
let sceneRef = null;

class BattleScene extends Phaser.Scene {
  constructor() {
    super("BattleScene");
  }

  create() {
    this.fx = this.add.graphics();
    this.staticLayer = this.add.graphics();
    this.actionText = {
      player: this.add.text(210, 148, "", actionTextStyle()).setOrigin(0.5),
      enemy: this.add.text(750, 148, "", actionTextStyle()).setOrigin(0.5)
    };
    sceneRef = this;
    this.renderState(state);
  }

  renderState(currentState) {
    const width = this.scale.width;
    const height = this.scale.height;
    this.staticLayer.clear();

    this.staticLayer.fillStyle(0x15181b, 1);
    this.staticLayer.fillRect(0, 0, width, height);
    this.staticLayer.fillStyle(0x202428, 1);
    this.staticLayer.fillRect(0, height - 88, width, 88);
    this.staticLayer.lineStyle(2, 0x3a4045, 1);
    this.staticLayer.lineBetween(0, height - 88, width, height - 88);

    this.drawFighter(210, height - 138, 0x52c6b8, "你", currentState.playerQi, false);
    this.drawFighter(750, height - 138, 0xe76457, "AI", currentState.enemyQi, true);
    this.drawCenterMeter(width / 2, height - 150, currentState);
  }

  async playRound(result) {
    this.actionText.player.setText(result.playerAction.label);
    this.actionText.enemy.setText(result.enemyAction.label);
    this.fx.clear();

    await delay(130);
    this.drawActionFx("player", result.playerAction, result.playerHits);
    this.drawActionFx("enemy", result.enemyAction, result.enemyHits);
    this.cameras.main.shake(result.winner === "none" ? 70 : 130, result.winner === "none" ? 0.002 : 0.006);
    await delay(520);

    this.actionText.player.setText("");
    this.actionText.enemy.setText("");
    this.fx.clear();
  }

  drawFighter(x, y, color, name, qi, flip) {
    this.staticLayer.lineStyle(8, color, 1);
    this.staticLayer.strokeCircle(x, y - 78, 24);
    this.staticLayer.lineBetween(x, y - 52, x, y + 20);
    this.staticLayer.lineBetween(x, y - 20, x + (flip ? -46 : 46), y + 2);
    this.staticLayer.lineBetween(x, y + 20, x - 30, y + 62);
    this.staticLayer.lineBetween(x, y + 20, x + 30, y + 62);

    this.staticLayer.lineStyle(2, 0x0f1113, 0.8);
    this.staticLayer.fillStyle(0x0f1113, 0.78);
    this.staticLayer.fillRoundedRect(x - 56, y + 80, 112, 28, 4);
    this.staticLayer.strokeRoundedRect(x - 56, y + 80, 112, 28, 4);

    this.staticLayer.fillStyle(0xf2eee7, 1);
    this.staticLayer.fillCircle(x - 14, y + 94, name === "你" ? 4 : 3);
    this.staticLayer.fillCircle(x + 14, y + 94, name === "AI" ? 4 : 3);

    for (let i = 0; i < MAX_QI; i += 1) {
      const orbX = x - 28 + i * 28;
      const orbY = y - 126;
      this.staticLayer.lineStyle(2, 0x8a7440, 1);
      this.staticLayer.fillStyle(i < qi ? 0xf5c86a : 0x15181b, 1);
      this.staticLayer.fillCircle(orbX, orbY, 9);
      this.staticLayer.strokeCircle(orbX, orbY, 9);
    }
  }

  drawCenterMeter(x, y, currentState) {
    this.staticLayer.fillStyle(0x0f1113, 0.88);
    this.staticLayer.fillRoundedRect(x - 88, y - 30, 176, 62, 5);
    this.staticLayer.lineStyle(1, 0x3a4045, 1);
    this.staticLayer.strokeRoundedRect(x - 88, y - 30, 176, 62, 5);
    this.staticLayer.fillStyle(0xf5c86a, 1);
    this.staticLayer.fillRect(x - 58, y - 4, 116, 8);
    this.staticLayer.fillStyle(0x52c6b8, 1);
    this.staticLayer.fillRect(x - 58, y - 4, currentState.playerScore * 38, 8);
    this.staticLayer.fillStyle(0xe76457, 1);
    this.staticLayer.fillRect(x + 58 - currentState.enemyScore * 38, y + 12, currentState.enemyScore * 38, 8);
  }

  drawActionFx(side, action, hits) {
    const fromX = side === "player" ? 300 : 660;
    const toX = side === "player" ? 660 : 300;
    const y = 280;
    const tint = side === "player" ? 0x52c6b8 : 0xe76457;

    if (action.type === "charge") {
      this.fx.lineStyle(3, 0xf5c86a, 1);
      this.fx.strokeCircle(fromX, y - 70, 34);
      this.fx.strokeCircle(fromX, y - 70, 50);
      this.fx.fillStyle(0xf5c86a, 0.22);
      this.fx.fillCircle(fromX, y - 70, 54);
      return;
    }

    if (action.type === "defense") {
      this.fx.lineStyle(action.id === "wall" ? 8 : 5, action.id === "wall" ? 0x74a8ff : 0xf2eee7, 1);
      if (action.id === "wall") {
        this.fx.strokeRoundedRect(fromX - 42, y - 92, 84, 104, 8);
      } else {
        this.fx.lineBetween(fromX - 46, y + 4, fromX + 48, y - 96);
        this.fx.lineBetween(fromX - 30, y + 10, fromX + 64, y - 90);
      }
      return;
    }

    const beamColor = action.id === "genki" ? 0xf5c86a : action.id === "bigWave" ? 0xe76457 : 0x74a8ff;
    const thickness = action.id === "genki" ? 16 : action.id === "bigWave" ? 11 : 7;
    this.fx.lineStyle(thickness, beamColor, hits ? 1 : 0.58);
    this.fx.lineBetween(fromX, y - 54, toX, y - 54);
    this.fx.lineStyle(2, tint, 0.9);
    this.fx.strokeCircle(toX, y - 54, hits ? 34 : 18);

    if (!hits) {
      this.fx.lineStyle(3, 0xf2eee7, 0.65);
      this.fx.lineBetween((fromX + toX) / 2 - 22, y - 78, (fromX + toX) / 2 + 22, y - 30);
      this.fx.lineBetween((fromX + toX) / 2 + 22, y - 78, (fromX + toX) / 2 - 22, y - 30);
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: "#15181b",
  width: 960,
  height: 540,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BattleScene]
});

buildActionButtons();
renderHud();

dom.resetButton.addEventListener("click", resetMatch);
window.addEventListener("keydown", (event) => {
  if (event.repeat || resolving) {
    return;
  }

  const actionId = ACTION_ORDER[Number(event.key) - 1];
  if (actionId) {
    playTurn(actionId);
  }
});

function buildActionButtons() {
  dom.actionButtons.replaceChildren(
    ...ACTION_ORDER.map((actionId) => {
      const action = ACTIONS[actionId];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "action-button";
      button.dataset.action = actionId;
      button.title = action.description;
      button.innerHTML = `
        <span class="action-label">${action.label}</span>
        <span class="action-cost">${action.cost === 0 ? "不耗气" : `耗 ${action.cost} 气`}</span>
      `;
      button.addEventListener("click", () => playTurn(actionId));
      return button;
    })
  );
}

async function playTurn(playerActionId) {
  if (resolving || state.matchOver || !getLegalActions(state.playerQi).some((action) => action.id === playerActionId)) {
    return;
  }

  resolving = true;
  renderHud();

  const enemyActionId = chooseEnemyAction(state, history);
  const resolvedRound = state.round;
  pulseBeat("拍");
  await delay(320);
  pulseBeat("拍");
  await delay(320);
  pulseBeat("出招");

  const result = resolveRound(state, playerActionId, enemyActionId);
  await sceneRef?.playRound(result);

  history.push({
    playerActionId,
    enemyActionId,
    winner: result.winner
  });
  state = result.nextState;
  addLogEntry(result, resolvedRound);
  sceneRef?.renderState(state);

  resolving = false;
  renderHud(result.summary);
}

function renderHud(message) {
  dom.playerScore.textContent = String(state.playerScore);
  dom.enemyScore.textContent = String(state.enemyScore);
  dom.playerQi.replaceChildren(...renderQiDots(state.playerQi));
  dom.enemyQi.replaceChildren(...renderQiDots(state.enemyQi));
  dom.enemyRead.textContent = describeEnemyMood(state, history);

  if (state.matchOver) {
    dom.beatText.textContent = state.playerScore > state.enemyScore ? "你赢下这局" : "AI 赢下这局";
  } else if (message) {
    dom.beatText.textContent = message;
  } else {
    dom.beatText.textContent = `第 ${state.round} 回合`;
  }

  for (const button of dom.actionButtons.querySelectorAll("button")) {
    const actionId = button.dataset.action;
    const legal = getLegalActions(state.playerQi).some((action) => action.id === actionId);
    button.disabled = resolving || state.matchOver || !legal;
  }
}

function renderQiDots(qi) {
  return Array.from({ length: MAX_QI }, (_, index) => {
    const dot = document.createElement("span");
    dot.className = index < qi ? "qi-dot qi-dot--filled" : "qi-dot";
    return dot;
  });
}

function addLogEntry(result, roundNumber) {
  const item = document.createElement("li");
  item.innerHTML = `<strong>第 ${roundNumber} 回合</strong> 你出 ${result.playerAction.shortLabel}，AI 出 ${result.enemyAction.shortLabel}。${result.summary}`;
  dom.roundLog.prepend(item);

  while (dom.roundLog.children.length > 8) {
    dom.roundLog.lastElementChild.remove();
  }
}

function resetMatch() {
  state = createInitialState();
  history = [];
  resolving = false;
  dom.roundLog.replaceChildren();
  sceneRef?.renderState(state);
  renderHud();
}

function pulseBeat(text) {
  dom.beatText.textContent = text;
  dom.beatText.animate(
    [
      { transform: "scale(1)", opacity: 0.8 },
      { transform: "scale(1.18)", opacity: 1 },
      { transform: "scale(1)", opacity: 1 }
    ],
    { duration: 220, easing: "ease-out" }
  );
}

function actionTextStyle() {
  return {
    color: "#f5c86a",
    fontFamily: "Noto Sans SC, Microsoft YaHei, sans-serif",
    fontSize: "26px",
    fontStyle: "bold",
    stroke: "#0f1113",
    strokeThickness: 5
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
