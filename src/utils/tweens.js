// 常用缓动动画封装

export function tweenScale(scene, target, fromScale, toScale, duration = 200, ease = 'Back.easeOut') {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      scaleX: toScale,
      scaleY: toScale,
      duration,
      ease,
      onComplete: resolve,
    });
  });
}

export function tweenMove(scene, target, x, y, duration = 300, ease = 'Power2') {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      x, y,
      duration,
      ease,
      onComplete: resolve,
    });
  });
}

export function tweenAlpha(scene, target, toAlpha, duration = 200) {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      alpha: toAlpha,
      duration,
      onComplete: resolve,
    });
  });
}

export function tweenShake(scene, target, intensity = 5, duration = 300) {
  return new Promise(resolve => {
    const originalX = target.x;
    const originalY = target.y;
    scene.tweens.add({
      targets: target,
      x: originalX + intensity,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        target.x = originalX;
        target.y = originalY;
        resolve();
      },
    });
  });
}

export function tweenPop(scene, target, duration = 250) {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: duration / 2,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: resolve,
    });
  });
}

export function tweenFlip(scene, textObj, newText, newColor, duration = 300) {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: textObj,
      scaleX: 0,
      duration: duration / 2,
      ease: 'Quad.easeIn',
      onComplete: () => {
        textObj.setText(newText);
        if (newColor !== undefined) textObj.setColor(newColor);
        scene.tweens.add({
          targets: textObj,
          scaleX: 1,
          duration: duration / 2,
          ease: 'Quad.easeOut',
          onComplete: resolve,
        });
      },
    });
  });
}

export function tweenFadeIn(scene, target, duration = 400) {
  target.setAlpha(0);
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      alpha: 1,
      duration,
      ease: 'Quad.easeOut',
      onComplete: resolve,
    });
  });
}

export function tweenFadeOut(scene, target, duration = 300) {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      alpha: 0,
      duration,
      ease: 'Quad.easeIn',
      onComplete: resolve,
    });
  });
}

export function delay(scene, ms) {
  return new Promise(resolve => {
    scene.time.delayedCall(ms, resolve);
  });
}
