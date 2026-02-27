import Phaser from 'phaser';

interface Crack {
  sprite: Phaser.GameObjects.Sprite;
  overlap: Phaser.Physics.Arcade.Collider;
  createdAt: number;
}

export class CrackingGround {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private cracks: Crack[] = [];
  private maxCracks: number;
  private groundY: number;

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    groundY: number,
    maxCracks: number = 4
  ) {
    this.scene = scene;
    this.player = player;
    this.groundY = groundY;
    this.maxCracks = maxCracks;
  }

  openCrack(x: number) {
    if (this.cracks.length >= this.maxCracks) {
      this.sealOldest();
    }

    const crackSprite = this.scene.add.sprite(x, this.groundY, 'lava-crack');
    crackSprite.setDepth(2);
    this.scene.physics.add.existing(crackSprite, true);

    this.scene.tweens.add({
      targets: crackSprite,
      alpha: { from: 0.7, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 300,
    });

    const overlap = this.scene.physics.add.overlap(this.player, crackSprite, () => {
      this.scene.events.emit('lava-death');
    });

    this.cracks.push({
      sprite: crackSprite,
      overlap,
      createdAt: this.scene.time.now,
    });
  }

  private sealOldest() {
    const oldest = this.cracks.shift();
    if (!oldest) return;
    oldest.overlap.destroy();
    this.scene.tweens.add({
      targets: oldest.sprite,
      alpha: 0,
      scaleY: 0,
      duration: 300,
      onComplete: () => oldest.sprite.destroy(),
    });
  }

  sealAll() {
    while (this.cracks.length > 0) {
      this.sealOldest();
    }
  }

  destroy() {
    for (const crack of this.cracks) {
      crack.overlap.destroy();
      crack.sprite.destroy();
    }
    this.cracks = [];
  }
}
