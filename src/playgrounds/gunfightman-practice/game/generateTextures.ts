// @ts-nocheck
function buildTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.make.graphics({ add: false });
  draw(graphics, width, height);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

export function generateTextures(scene) {
  buildTexture(scene, 'sea-tile', 128, 128, (g, width, height) => {
    g.fillStyle(0x0b3858, 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0x125979, 0.32);
    g.fillCircle(26, 24, 18);
    g.fillCircle(96, 34, 22);
    g.fillCircle(44, 92, 26);
    g.fillCircle(104, 96, 18);

    g.lineStyle(3, 0x89d7e8, 0.12);
    g.strokeEllipse(34, 28, 34, 18);
    g.strokeEllipse(96, 34, 44, 22);
    g.strokeEllipse(48, 94, 52, 24);

    g.lineStyle(2, 0xbbe8f1, 0.1);
    g.beginPath();
    g.moveTo(0, 48);
    g.lineTo(40, 38);
    g.lineTo(86, 50);
    g.lineTo(128, 42);
    g.strokePath();

    g.beginPath();
    g.moveTo(0, 102);
    g.lineTo(24, 96);
    g.lineTo(70, 108);
    g.lineTo(128, 92);
    g.strokePath();
  });

  buildTexture(scene, 'player-raft', 80, 80, (g) => {
    g.fillStyle(0x09263a, 0.28);
    g.fillEllipse(40, 56, 44, 20);

    g.fillStyle(0x7f4f24, 1);
    g.fillEllipse(40, 46, 50, 26);
    g.lineStyle(3, 0xbb8a5f, 0.8);
    g.strokeEllipse(40, 46, 50, 26);

    g.fillStyle(0xf0c978, 1);
    g.fillEllipse(40, 32, 28, 24);

    g.fillStyle(0x20263f, 1);
    g.fillCircle(34, 31, 2);
    g.fillCircle(46, 31, 2);

    g.lineStyle(2, 0x8f5d24, 1);
    g.beginPath();
    g.moveTo(32, 39);
    g.lineTo(48, 39);
    g.strokePath();

    g.fillStyle(0x26415e, 1);
    g.fillRect(38, 10, 6, 20);
    g.fillStyle(0xd7dfe7, 1);
    g.fillRect(37, 7, 8, 7);
  });

  buildTexture(scene, 'flower-enemy', 72, 72, (g) => {
    const petals = [
      [36, 13],
      [52, 20],
      [58, 36],
      [52, 52],
      [36, 59],
      [20, 52],
      [14, 36],
      [20, 20],
    ];

    g.fillStyle(0xc65f6c, 1);
    petals.forEach(([x, y]) => {
      g.fillCircle(x, y, 10);
    });

    g.fillStyle(0xf9cf56, 1);
    g.fillCircle(36, 36, 13);
    g.lineStyle(3, 0x6d3247, 0.8);
    g.strokeCircle(36, 36, 13);
  });

  buildTexture(scene, 'hand-enemy', 64, 64, (g) => {
    g.fillStyle(0x7fd8c5, 1);
    g.fillRoundedRect(18, 20, 28, 28, 10);
    g.fillRoundedRect(18, 8, 8, 18, 6);
    g.fillRoundedRect(28, 4, 8, 22, 6);
    g.fillRoundedRect(38, 6, 8, 20, 6);
    g.fillRoundedRect(46, 14, 8, 18, 6);
    g.fillRoundedRect(12, 28, 12, 8, 5);
    g.lineStyle(3, 0x1d5b64, 0.8);
    g.strokeRoundedRect(18, 20, 28, 28, 10);
  });

  buildTexture(scene, 'pirate-enemy', 76, 76, (g) => {
    g.fillStyle(0x102236, 0.3);
    g.fillEllipse(38, 56, 38, 16);

    g.fillStyle(0xecb45a, 1);
    g.fillEllipse(38, 39, 30, 28);

    g.fillStyle(0x2b1c29, 1);
    g.fillRect(20, 16, 36, 8);
    g.fillRect(28, 8, 20, 10);
    g.fillStyle(0xbc434d, 1);
    g.fillRect(24, 12, 28, 4);

    g.fillStyle(0x20304a, 1);
    g.fillCircle(32, 38, 2);
    g.fillCircle(44, 38, 2);

    g.fillStyle(0xd7dde6, 1);
    g.fillRect(52, 38, 12, 6);
    g.fillStyle(0x3a506b, 1);
    g.fillRect(48, 36, 8, 10);
  });

  buildTexture(scene, 'boss-pirate', 124, 124, (g) => {
    g.fillStyle(0x11243a, 0.34);
    g.fillEllipse(62, 90, 64, 24);

    g.fillStyle(0x7c5a34, 1);
    g.fillEllipse(62, 82, 78, 34);
    g.lineStyle(4, 0xb18b62, 0.72);
    g.strokeEllipse(62, 82, 78, 34);

    g.fillStyle(0xefb565, 1);
    g.fillEllipse(62, 54, 42, 40);
    g.fillStyle(0x1f2e43, 1);
    g.fillCircle(52, 52, 3);
    g.fillCircle(72, 52, 3);

    g.fillStyle(0x241729, 1);
    g.fillRect(30, 24, 64, 12);
    g.fillRect(42, 12, 40, 14);
    g.fillStyle(0xc44554, 1);
    g.fillRect(38, 18, 48, 6);

    g.fillStyle(0xb7ced8, 1);
    g.fillRoundedRect(80, 42, 28, 44, 12);
    g.lineStyle(4, 0xe7f2f7, 0.8);
    g.strokeRoundedRect(80, 42, 28, 44, 12);
  });

  buildTexture(scene, 'boss-pirate-broken', 124, 124, (g) => {
    g.fillStyle(0x11243a, 0.34);
    g.fillEllipse(62, 90, 64, 24);

    g.fillStyle(0x7c5a34, 1);
    g.fillEllipse(62, 82, 78, 34);
    g.lineStyle(4, 0xb18b62, 0.72);
    g.strokeEllipse(62, 82, 78, 34);

    g.fillStyle(0xefb565, 1);
    g.fillEllipse(62, 54, 42, 40);
    g.fillStyle(0x1f2e43, 1);
    g.fillCircle(52, 52, 3);
    g.fillCircle(72, 52, 3);

    g.lineStyle(4, 0x8e5a30, 1);
    g.beginPath();
    g.moveTo(46, 38);
    g.lineTo(78, 38);
    g.strokePath();

    g.fillStyle(0xd46659, 1);
    g.fillRect(54, 60, 16, 6);
  });

  buildTexture(scene, 'hat-fragment', 54, 32, (g) => {
    g.fillStyle(0x241729, 1);
    g.fillRect(0, 14, 54, 10);
    g.fillRect(10, 4, 34, 14);
    g.fillStyle(0xc44554, 1);
    g.fillRect(6, 12, 42, 4);
  });

  buildTexture(scene, 'shop-boat', 112, 92, (g) => {
    g.fillStyle(0x0c2337, 0.28);
    g.fillEllipse(56, 74, 62, 18);

    g.fillStyle(0x855730, 1);
    g.fillEllipse(56, 66, 72, 26);
    g.lineStyle(4, 0xc08d5c, 0.7);
    g.strokeEllipse(56, 66, 72, 26);

    g.fillStyle(0xefe4c6, 1);
    g.fillRect(54, 18, 4, 34);
    g.fillTriangle(58, 20, 92, 36, 58, 52);

    g.fillStyle(0x4dc3cf, 0.84);
    g.fillRoundedRect(16, 48, 24, 16, 8);
    g.fillRoundedRect(72, 48, 24, 16, 8);
  });

  buildTexture(scene, 'player-bullet', 20, 20, (g) => {
    g.fillStyle(0xffe4a3, 1);
    g.fillCircle(10, 10, 6);
    g.lineStyle(2, 0xfff6d8, 0.9);
    g.strokeCircle(10, 10, 6);
  });

  buildTexture(scene, 'enemy-bullet', 20, 20, (g) => {
    g.fillStyle(0xff7b6b, 1);
    g.fillCircle(10, 10, 6);
    g.lineStyle(2, 0xffc7bf, 0.75);
    g.strokeCircle(10, 10, 6);
  });

  buildTexture(scene, 'diamond-pickup', 26, 26, (g) => {
    g.fillStyle(0x66f0ff, 1);
    g.fillTriangle(13, 1, 24, 13, 13, 25);
    g.fillTriangle(13, 1, 2, 13, 13, 25);
    g.lineStyle(2, 0xe7fdff, 0.9);
    g.strokeTriangle(13, 1, 24, 13, 13, 25);
    g.strokeTriangle(13, 1, 2, 13, 13, 25);
  });

  buildTexture(scene, 'heart-pickup', 28, 28, (g) => {
    g.fillStyle(0xff6d7d, 1);
    g.fillCircle(9, 10, 7);
    g.fillCircle(19, 10, 7);
    g.fillTriangle(3, 13, 25, 13, 14, 26);
  });

  buildTexture(scene, 'impact-ring', 128, 128, (g) => {
    g.fillStyle(0xffd96f, 0.12);
    g.fillCircle(64, 64, 46);
    g.lineStyle(10, 0xfff3be, 0.84);
    g.strokeCircle(64, 64, 42);
  });

  buildTexture(scene, 'wake', 48, 24, (g) => {
    g.fillStyle(0xbdeaf0, 0.22);
    g.fillEllipse(24, 12, 34, 10);
    g.lineStyle(2, 0xf2ffff, 0.26);
    g.strokeEllipse(24, 12, 34, 10);
  });

  buildTexture(scene, 'spark', 16, 16, (g) => {
    g.fillStyle(0xffefbc, 1);
    g.fillCircle(8, 8, 4);
  });

  buildTexture(scene, 'night-mask', 1024, 1024, (g, width, height) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const clearHalf = 120;
    const softHalf = 180;

    g.fillStyle(0x031018, 0.86);
    g.fillRect(0, 0, width, centerY - softHalf);
    g.fillRect(0, centerY + softHalf, width, centerY - softHalf);
    g.fillRect(0, centerY - softHalf, centerX - softHalf, softHalf * 2);
    g.fillRect(centerX + softHalf, centerY - softHalf, centerX - softHalf, softHalf * 2);

    g.fillStyle(0x031018, 0.54);
    g.fillRect(centerX - softHalf, centerY - softHalf, softHalf * 2, softHalf - clearHalf);
    g.fillRect(centerX - softHalf, centerY + clearHalf, softHalf * 2, softHalf - clearHalf);
    g.fillRect(centerX - softHalf, centerY - clearHalf, softHalf - clearHalf, clearHalf * 2);
    g.fillRect(centerX + clearHalf, centerY - clearHalf, softHalf - clearHalf, clearHalf * 2);
  });
}
