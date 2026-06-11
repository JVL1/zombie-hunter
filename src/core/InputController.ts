import Phaser from 'phaser';
import { PLAYER } from '../config';

// Unified keyboard + gamepad input with edge detection and jump buffering.
// Call update() once per frame BEFORE reading any of the booleans.
export class InputController {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyJ: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevPadJump = false;
  private prevPadAttack = false;
  private prevPadDash = false;

  left = false;
  right = false;
  down = false;
  jumpHeld = false;
  jumpJustPressed = false;
  attackJustPressed = false;
  dashJustPressed = false;

  private jumpBufferedAt = -Infinity;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    if (scene.input.gamepad) {
      if (scene.input.gamepad.total > 0) {
        this.pad = scene.input.gamepad.getPad(0);
      }
      scene.input.gamepad.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        this.pad = pad;
      });
    }
  }

  update() {
    const padX = this.pad ? this.pad.leftStick.x : 0;
    const padLeft = this.pad ? this.pad.left || padX < -0.3 : false;
    const padRight = this.pad ? this.pad.right || padX > 0.3 : false;
    const padDown = this.pad ? this.pad.down || (this.pad.leftStick.y > 0.5) : false;
    const padJump = this.pad ? this.pad.A : false;
    const padAttack = this.pad ? Boolean(this.pad.X || this.pad.B) : false;
    const padDash = this.pad ? this.pad.R1 > 0 || this.pad.L1 > 0 : false;

    this.left = this.cursors.left.isDown || padLeft;
    this.right = this.cursors.right.isDown || padRight;
    this.down = this.cursors.down.isDown || padDown;
    this.jumpHeld =
      this.cursors.up.isDown || this.cursors.space.isDown || this.keyW.isDown || padJump;

    this.jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keyW) ||
      (padJump && !this.prevPadJump);

    this.attackJustPressed =
      Phaser.Input.Keyboard.JustDown(this.keyA) ||
      Phaser.Input.Keyboard.JustDown(this.keyJ) ||
      (padAttack && !this.prevPadAttack);

    this.dashJustPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.shift) || (padDash && !this.prevPadDash);

    this.prevPadJump = padJump;
    this.prevPadAttack = padAttack;
    this.prevPadDash = padDash;

    if (this.jumpJustPressed) {
      this.jumpBufferedAt = this.scene.time.now;
    }
  }

  // True if a jump was pressed within the buffer window; consuming clears it.
  consumeBufferedJump(): boolean {
    if (this.scene.time.now - this.jumpBufferedAt <= PLAYER.jumpBufferMs) {
      this.jumpBufferedAt = -Infinity;
      return true;
    }
    return false;
  }
}
