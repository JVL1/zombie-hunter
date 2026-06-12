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
  private keyEnter: Phaser.Input.Keyboard.Key;
  private pad: Phaser.Input.Gamepad.Gamepad | null = null;
  private prevPadJump = false;
  private prevPadAttack = false;
  private prevPadDash = false;
  private prevPadUp = false;
  private prevPadDown = false;
  private prevPadLeft = false;
  private prevPadRight = false;

  left = false;
  right = false;
  down = false;
  upJustPressed = false;
  downJustPressed = false;
  leftJustPressed = false;
  rightJustPressed = false;
  jumpHeld = false;
  jumpJustPressed = false;
  attackJustPressed = false;
  dashJustPressed = false;
  confirmJustPressed = false;

  private jumpBufferedAt = -Infinity;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyEnter = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

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
    const arrowUpJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.up);
    const arrowDownJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.down);
    const arrowLeftJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.left);
    const arrowRightJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.right);
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.space);
    const wJustDown = Phaser.Input.Keyboard.JustDown(this.keyW);
    const aJustDown = Phaser.Input.Keyboard.JustDown(this.keyA);
    const jJustDown = Phaser.Input.Keyboard.JustDown(this.keyJ);
    const shiftJustDown = Phaser.Input.Keyboard.JustDown(this.cursors.shift);
    // Filter OS key-repeat: a held ENTER carried into a new scene re-arms
    // JustDown on its first auto-repeat event (Phaser's Key.onDown has no
    // repeat guard), which would fire a phantom confirm in the shop.
    const enterJustDown =
      Phaser.Input.Keyboard.JustDown(this.keyEnter) &&
      !(this.keyEnter.originalEvent as KeyboardEvent | undefined)?.repeat;

    const padX = this.pad ? this.pad.leftStick.x : 0;
    const padY = this.pad ? this.pad.leftStick.y : 0;
    const padLeft = this.pad ? this.pad.left || padX < -0.3 : false;
    const padRight = this.pad ? this.pad.right || padX > 0.3 : false;
    const padDown = this.pad ? this.pad.down || padY > 0.5 : false;
    // Menu nav uses a deliberately stiffer 0.5 stick threshold than gameplay
    // left/right (0.3) so a drifting stick doesn't skip shop selections.
    const padMenuUp = this.pad ? this.pad.up || padY < -0.5 : false;
    const padMenuDown = padDown;
    const padMenuLeft = this.pad ? this.pad.left || padX < -0.5 : false;
    const padMenuRight = this.pad ? this.pad.right || padX > 0.5 : false;
    const padJump = this.pad ? this.pad.A : false;
    const padAttack = this.pad ? Boolean(this.pad.X || this.pad.B) : false;
    const padDash = this.pad ? this.pad.R1 > 0 || this.pad.L1 > 0 : false;

    this.left = this.cursors.left.isDown || padLeft;
    this.right = this.cursors.right.isDown || padRight;
    this.down = this.cursors.down.isDown || padDown;
    this.jumpHeld =
      this.cursors.up.isDown || this.cursors.space.isDown || this.keyW.isDown || padJump;

    this.upJustPressed = arrowUpJustDown || (padMenuUp && !this.prevPadUp);
    this.downJustPressed = arrowDownJustDown || (padMenuDown && !this.prevPadDown);
    this.leftJustPressed = arrowLeftJustDown || (padMenuLeft && !this.prevPadLeft);
    this.rightJustPressed = arrowRightJustDown || (padMenuRight && !this.prevPadRight);

    this.jumpJustPressed =
      arrowUpJustDown || spaceJustDown || wJustDown || (padJump && !this.prevPadJump);

    this.attackJustPressed =
      aJustDown || jJustDown || (padAttack && !this.prevPadAttack);

    this.dashJustPressed = shiftJustDown || (padDash && !this.prevPadDash);
    this.confirmJustPressed = this.attackJustPressed || enterJustDown;

    this.prevPadJump = padJump;
    this.prevPadAttack = padAttack;
    this.prevPadDash = padDash;
    this.prevPadUp = padMenuUp;
    this.prevPadDown = padMenuDown;
    this.prevPadLeft = padMenuLeft;
    this.prevPadRight = padMenuRight;

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
