import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

type Matrix = number[][];
interface Piece { shape: Matrix; color: string; name: string; x: number; y: number; }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  readonly cols = 10;
  readonly rows = 20;
  readonly pieces = [
    { name: 'I', color: '#55e8ff', shape: [[1,1,1,1]] },
    { name: 'O', color: '#ffe16a', shape: [[1,1],[1,1]] },
    { name: 'T', color: '#b89aff', shape: [[0,1,0],[1,1,1]] },
    { name: 'S', color: '#c7ff5e', shape: [[0,1,1],[1,1,0]] },
    { name: 'Z', color: '#ff6b91', shape: [[1,1,0],[0,1,1]] },
    { name: 'J', color: '#6594ff', shape: [[1,0,0],[1,1,1]] },
    { name: 'L', color: '#ffad66', shape: [[0,0,1],[1,1,1]] }
  ];

  board: (string | null)[][] = this.emptyBoard();
  current: Piece | null = null;
  next: Piece = this.randomPiece();
  score = 0;
  best = Number(localStorage.getItem('prukis-best') || 0);
  lines = 0;
  level = 1;
  running = false;
  paused = false;
  gameOver = false;
  sound = false;
  showHelp = false;
  private frame = 0;
  private lastTime = 0;
  private dropClock = 0;
  private audio?: AudioContext;
  private touchStartX = 0;
  private touchStartY = 0;

  get speedLabel(): string { return `${this.level}.0x`; }
  get progress(): number { return (this.lines % 10) * 10; }
  get statusLabel(): string { return this.gameOver ? 'FINALIZADO' : this.paused ? 'PAUSADO' : this.running ? 'EN PARTIDA' : 'EN ESPERA'; }

  get cells(): { color: string | null; ghost: boolean }[] {
    const view = this.board.map(row => [...row]);
    if (this.current && this.running && !this.gameOver) {
      const ghostY = this.getGhostY();
      this.paintPiece(view, this.current, ghostY, true);
      this.paintPiece(view, this.current, this.current.y, false);
    }
    return view.flatMap(row => row.map(color => ({ color, ghost: false })));
  }

  get nextCells(): (string | null)[] {
    const result: (string | null)[] = Array(16).fill(null);
    this.next.shape.forEach((row, y) => row.forEach((v, x) => {
      if (v) result[y * 4 + x] = this.next.color;
    }));
    return result;
  }

  ngOnDestroy(): void { cancelAnimationFrame(this.frame); this.audio?.close(); }

  private emptyBoard(): (string | null)[][] {
    return Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
  }

  private randomPiece(): Piece {
    const base = this.pieces[Math.floor(Math.random() * this.pieces.length)];
    const shape = base.shape.map(row => [...row]);
    return { name: base.name, color: base.color, shape, x: Math.floor((this.cols - shape[0].length) / 2), y: 0 };
  }

  private clonePiece(piece: Piece): Piece {
    return { ...piece, shape: piece.shape.map(row => [...row]) };
  }

  private collision(piece: Piece, dx = 0, dy = 0, shape = piece.shape): boolean {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue;
        const nx = piece.x + x + dx;
        const ny = piece.y + y + dy;
        if (nx < 0 || nx >= this.cols || ny >= this.rows) return true;
        if (ny >= 0 && this.board[ny][nx]) return true;
      }
    }
    return false;
  }

  private paintPiece(target: (string | null)[][], piece: Piece, yPosition: number, ghost: boolean): void {
    piece.shape.forEach((row, y) => row.forEach((value, x) => {
      if (!value) return;
      const px = piece.x + x;
      const py = yPosition + y;
      if (px < 0 || px >= this.cols || py < 0 || py >= this.rows) return;
      if (!ghost || !target[py][px]) target[py][px] = ghost ? `ghost:${piece.color}` : piece.color;
    }));
  }

  private getGhostY(): number {
    if (!this.current) return 0;
    let y = this.current.y;
    const ghost = this.clonePiece(this.current);
    while (!this.collision(ghost, 0, 1)) { ghost.y++; y++; }
    return y;
  }

  startGame(): void {
    cancelAnimationFrame(this.frame);
    this.board = this.emptyBoard();
    this.current = this.randomPiece();
    this.next = this.randomPiece();
    this.score = 0; this.lines = 0; this.level = 1;
    this.running = true; this.paused = false; this.gameOver = false;
    this.dropClock = 0; this.lastTime = 0;
    this.tick();
  }

  playAction(): void {
    if (this.running && this.paused && !this.gameOver) {
      this.togglePause();
      return;
    }
    this.startGame();
  }

  boardTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (!touch) return;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  boardTouchEnd(event: TouchEvent): void {
    if (!this.running || this.paused || this.gameOver) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    const threshold = 18;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) {
      this.rotate();
    } else if (Math.abs(dx) > Math.abs(dy)) {
      this.move(dx > 0 ? 1 : -1, 0);
    } else if (dy > 0) {
      this.move(0, 1);
    } else {
      this.hardDrop();
    }

    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  boardTouchCancel(): void {
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  togglePause(): void {
    if (!this.running || this.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) cancelAnimationFrame(this.frame);
    else { this.lastTime = 0; this.tick(); }
  }

  move(dx: number, dy: number): void {
    if (!this.running || this.paused || !this.current) return;
    if (!this.collision(this.current, dx, dy)) {
      this.current.x += dx; this.current.y += dy;
      if (dy > 0) { this.score += 1; this.updateBest(); }
      this.beep(180, .025);
    } else if (dy > 0) this.lockPiece();
  }

  rotate(): void {
    if (!this.running || this.paused || !this.current) return;
    const shape = this.current.shape[0].map((_, i) => this.current!.shape.map(row => row[i]).reverse());
    for (const offset of [0, -1, 1, -2, 2]) {
      if (!this.collision(this.current, offset, 0, shape)) {
        this.current.x += offset; this.current.shape = shape; this.beep(430, .045); return;
      }
    }
  }

  hardDrop(): void {
    if (!this.running || this.paused || !this.current) return;
    let distance = 0;
    while (!this.collision(this.current, 0, 1)) { this.current.y++; distance++; }
    this.score += distance * 2;
    this.updateBest();
    this.beep(110, .08);
    this.lockPiece();
  }

  private lockPiece(): void {
    if (!this.current) return;
    let overflow = false;
    this.current.shape.forEach((row, y) => row.forEach((v, x) => {
      if (!v) return;
      const px = this.current!.x + x;
      const py = this.current!.y + y;
      if (py < 0) overflow = true;
      else this.board[py][px] = this.current!.color;
    }));
    if (overflow) { this.finishGame(); return; }
    this.clearLines();
    this.current = this.next;
    this.current.x = Math.floor((this.cols - this.current.shape[0].length) / 2);
    this.current.y = 0;
    this.next = this.randomPiece();
    if (this.collision(this.current)) this.finishGame();
  }

  private clearLines(): void {
    let cleared = 0;
    for (let y = this.rows - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== null)) {
        this.board.splice(y, 1);
        this.board.unshift(Array(this.cols).fill(null));
        cleared++; y++;
      }
    }
    if (cleared) {
      const points = [0, 100, 300, 500, 800];
      this.score += points[cleared] * this.level;
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10) + 1;
      this.beep(620, .13);
      this.updateBest();
    }
  }

  private updateBest(): void {
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem('prukis-best', String(this.best));
    }
  }

  private finishGame(): void {
    this.running = false; this.gameOver = true;
    cancelAnimationFrame(this.frame);
    this.beep(90, .3);
  }

  private tick = (time = 0): void => {
    if (!this.running || this.paused || this.gameOver) return;
    const delta = Math.min(time - this.lastTime, 100);
    this.lastTime = time;
    this.dropClock += delta;
    const interval = Math.max(85, 850 - (this.level - 1) * 65);
    if (this.dropClock >= interval) {
      this.dropClock = 0;
      this.move(0, 1);
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private beep(freq: number, duration: number): void {
    if (!this.sound) return;
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === 'suspended') void this.audio.resume();
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(.035, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(this.audio.destination);
      oscillator.start(); oscillator.stop(this.audio.currentTime + duration);
    } catch { /* Audio is optional. */ }
  }

  toggleSound(): void { this.sound = !this.sound; if (this.sound) this.beep(440, .08); }

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const handled = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'];
    if (handled.includes(event.key)) event.preventDefault();
    if (event.key === 'Escape' || event.key.toLowerCase() === 'p') { this.togglePause(); return; }
    if (!this.running || this.paused) return;
    switch (event.key) {
      case 'ArrowLeft': this.move(-1, 0); break;
      case 'ArrowRight': this.move(1, 0); break;
      case 'ArrowDown': this.move(0, 1); break;
      case 'ArrowUp': case 'x': case 'X': this.rotate(); break;
      case ' ': this.hardDrop(); break;
    }
  }

  formatScore(value: number): string { return value.toLocaleString('es-ES'); }
}
