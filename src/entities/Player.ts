import Phaser from 'phaser';
import { Assets, PlayerAnims } from '../assets';
import { flashSprite } from '../systems/Combat';
import { GameState } from '../systems/GameState';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed = 200;
  private jumpForce = -450;
  private attackKey: Phaser.Input.Keyboard.Key;
  private isAttacking = false;
  private gameState = GameState.getInstance();
  private attackCooldown = 300; // ms
  private lastAttackTime = 0;
  private isSlamming = false;
  private swordOverlay: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, Assets.PLAYER_SHEET, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    // Adjust physics body to match character (sprite is 80x64 but character is smaller)
    this.body!.setSize(24, 48);
    this.body!.setOffset(28, 16);

    // Sword overlay — same frame layout, rendered on top of player
    this.swordOverlay = scene.add.sprite(x, y, Assets.PLAYER_SWORD, 0);
    this.swordOverlay.setDepth(this.depth + 1);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    // Sprite faces left by default, flip to face right initially
    this.setFlipX(true);
    this.swordOverlay.setFlipX(true);

    this.play(PlayerAnims.IDLE.key);
  }

  update() {
    // Horizontal movement
    // Sprite faces left by default, so flipX=true means facing right
    if (this.cursors.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
      this.setFlipX(false); // face left (default direction)
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(this.moveSpeed);
      this.setFlipX(true); // flip to face right
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

    // Animation state (attack animation takes priority)
    if (!this.isAttacking) {
      this.updateAnimation();
    }

    // Sync sword overlay with player position, frame, and flip
    this.swordOverlay.setPosition(this.x, this.y);
    this.swordOverlay.setFlipX(this.flipX);
    this.swordOverlay.setFrame(this.frame.name);
  }

  private updateAnimation() {
    if (!this.body!.blocked.down) {
      if (this.body!.velocity.y < 0) {
        this.play(PlayerAnims.JUMP.key, true);
      } else {
        this.play(PlayerAnims.FALL.key, true);
      }
    } else if (Math.abs(this.body!.velocity.x) > 0) {
      this.play(PlayerAnims.WALK.key, true);
    } else {
      this.play(PlayerAnims.IDLE.key, true);
    }
  }

  attack(): Phaser.GameObjects.Rectangle | null {
    const now = this.scene.time.now;
    if (this.isAttacking || now - this.lastAttackTime < this.attackCooldown) {
      return null;
    }

    this.isAttacking = true;
    this.lastAttackTime = now;

    // Detect air slam: airborne and falling
    const isAirborne = !this.body!.blocked.down;
    const isFalling = this.body!.velocity.y > 0;

    if (isAirborne && isFalling) {
      // --- DOWNWARD SWORD SLAM ---
      this.isSlamming = true;

      this.play(PlayerAnims.ATTACK.key, true);
      this.once('animationcomplete-' + PlayerAnims.ATTACK.key, () => {
        this.isAttacking = false;
        this.isSlamming = false;
      });

      // Hitbox BELOW the player (32 wide, 40 tall)
      const hitbox = this.scene.add.rectangle(this.x, this.y + 40, 32, 40, 0xffffff, 0.3);
      this.scene.physics.add.existing(hitbox, false);
      (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

      this.scene.events.emit('player-slam', hitbox);

      this.scene.time.delayedCall(150, () => {
        hitbox.destroy();
      });

      return hitbox;
    }

    // --- REGULAR GROUND/AIR SWING ---
    this.play(PlayerAnims.ATTACK.key, true);
    this.once('animationcomplete-' + PlayerAnims.ATTACK.key, () => {
      this.isAttacking = false;
    });

    // Hitbox in front of player (flipX=true means facing right)
    const offsetX = this.flipX ? 30 : -30;
    const hitbox = this.scene.add.rectangle(this.x + offsetX, this.y, 40, 32, 0xffffff, 0.3);
    this.scene.physics.add.existing(hitbox, false);
    (hitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.scene.events.emit('player-attack', hitbox);

    this.scene.time.delayedCall(100, () => {
      hitbox.destroy();
    });

    return hitbox;
  }

  getIsSlamming(): boolean {
    return this.isSlamming;
  }

  pogoBounce() {
    this.setVelocityY(-250);
  }

  takeDamage(amount: number) {
    this.gameState.health -= amount;
    flashSprite(this.scene, this);

    if (this.gameState.health <= 0) {
      this.gameState.health = 0;
      this.play(PlayerAnims.DEATH.key);
      this.scene.events.emit('player-died');
    }
  }
}
