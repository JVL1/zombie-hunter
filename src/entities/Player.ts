import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed = 200;
  private jumpForce = -450;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    this.cursors = scene.input.keyboard!.createCursorKeys();
  }

  update() {
    // Horizontal movement
    if (this.cursors.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
      this.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(this.moveSpeed);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    // Jump — only when touching ground
    if (this.cursors.up.isDown && this.body!.blocked.down) {
      this.setVelocityY(this.jumpForce);
    }
  }
}
