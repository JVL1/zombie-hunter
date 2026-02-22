import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed = 200;
  private jumpForce = -450;
  private attackKey: Phaser.Input.Keyboard.Key;
  private isAttacking = false;
  private attackCooldown = 300; // ms
  private lastAttackTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
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

    // Attack
    if (this.attackKey.isDown) {
      this.attack();
    }
  }

  attack(): Phaser.GameObjects.Rectangle | null {
    const now = this.scene.time.now;
    if (this.isAttacking || now - this.lastAttackTime < this.attackCooldown) {
      return null;
    }

    this.isAttacking = true;
    this.lastAttackTime = now;

    // Create hitbox in front of player
    const offsetX = this.flipX ? -30 : 30;
    const hitbox = this.scene.add.rectangle(
      this.x + offsetX, this.y, 40, 32, 0xffffff, 0.3
    );
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Emit event so scene can wire up overlaps
    this.scene.events.emit('player-attack', hitbox);

    // Remove hitbox after short duration
    this.scene.time.delayedCall(100, () => {
      hitbox.destroy();
      this.isAttacking = false;
    });

    return hitbox;
  }
}
