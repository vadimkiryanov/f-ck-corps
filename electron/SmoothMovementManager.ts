import { BrowserWindow, Rectangle } from 'electron';

// A simplified WindowPool interface
interface WindowPool {
    get(name: string): BrowserWindow | undefined;
}

class SmoothMovementManager {
    private windowPool: WindowPool;
    private stepSize: number;
    private animationDuration: number;
    private headerPosition: { x: number; y: number };
    private isAnimating: boolean;
    private animationTimers: Map<BrowserWindow, ReturnType<typeof setTimeout>>;
    // This property was in the original code but not used. Assuming it's for future use.
    // private layoutManager: LayoutManager; 

    constructor(windowPool: WindowPool) {
        this.windowPool = windowPool;
        this.stepSize = 80;
        this.animationDuration = 300;
        this.headerPosition = { x: 0, y: 0 };
        this.isAnimating = false;
        this.animationTimers = new Map();
        // this.layoutManager = layoutManager; // Assuming layoutManager is passed or handled elsewhere
    }

    /**
     * @param {BrowserWindow} win
     * @returns {boolean}
     */
    private _isWindowValid(win: BrowserWindow | null | undefined): win is BrowserWindow {
        if (!win || win.isDestroyed()) {
            if (win && this.animationTimers.has(win)) {
                clearTimeout(this.animationTimers.get(win)!);
                this.animationTimers.delete(win);
            }
            return false;
        }
        return true;
    }

    /**
     * 
     * @param {BrowserWindow} win
     * @param {number} targetX
     * @param {number} targetY
     * @param {object} [options]
     * @param {object} [options.sizeOverride]
     * @param {function} [options.onComplete]
     * @param {number} [options.duration]
     */
    animateWindow(win: BrowserWindow, targetX: number, targetY: number, options: { sizeOverride?: { width: number, height: number }, onComplete?: () => void, duration?: number } = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        const { sizeOverride, onComplete, duration: animDuration } = options;
        const start = win.getBounds();
        const startTime = Date.now();
        const duration = animDuration || this.animationDuration;
        const { width, height } = sizeOverride || start;

        const step = () => {
            if (!this._isWindowValid(win)) {
                if (onComplete) onComplete();
                return;
            }

            const p = Math.min((Date.now() - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
            const x = start.x + (targetX - start.x) * eased;
            const y = start.y + (targetY - start.y) * eased;

            win.setBounds({ x: Math.round(x), y: Math.round(y), width, height });

            if (p < 1) {
                setTimeout(step, 8);
            } else {
                // Assuming layoutManager might be used here, but it's commented out for now.
                // this.layoutManager.updateLayout(); 
                if (onComplete) {
                    onComplete();
                }
            }
        };
        step();
    }

    fade(win: BrowserWindow, { from, to, duration = 250, onComplete }: { from?: number, to: number, duration?: number, onComplete?: () => void }) {
        if (!this._isWindowValid(win)) {
          if (onComplete) onComplete();
          return;
        }
        const startOpacity = from ?? win.getOpacity();
        const startTime = Date.now();
        
        const step = () => {
            if (!this._isWindowValid(win)) {
                if (onComplete) onComplete(); return;
            }
            const progress = Math.min(1, (Date.now() - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            win.setOpacity(startOpacity + (to - startOpacity) * eased);
    
            if (progress < 1) {
                setTimeout(step, 8);
            } else {
                win.setOpacity(to);
                if (onComplete) onComplete();
            }
        };
        step();
    }
    
    animateWindowBounds(win: BrowserWindow, targetBounds: Partial<Rectangle>, options: { duration?: number, onComplete?: () => void } = {}) {
        if (this.animationTimers.has(win)) {
            clearTimeout(this.animationTimers.get(win)!);
        }

        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }

        this.isAnimating = true;

        const startBounds = win.getBounds();
        const finalTargetBounds = { ...startBounds, ...targetBounds };
        const startTime = Date.now();
        const duration = options.duration || this.animationDuration;
    
        const step = () => {
            if (!this._isWindowValid(win)) {
                if (options.onComplete) options.onComplete();
                return;
            }
            
            const progress = Math.min(1, (Date.now() - startTime) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
    
            const newBounds = {
                x: Math.round(startBounds.x + (finalTargetBounds.x - startBounds.x) * eased),
                y: Math.round(startBounds.y + (finalTargetBounds.y - startBounds.y) * eased),
                width: Math.round(startBounds.width + (finalTargetBounds.width - startBounds.width) * eased),
                height: Math.round(startBounds.height + (finalTargetBounds.height - startBounds.height) * eased),
            };
            win.setBounds(newBounds);
    
            if (progress < 1) {
                const timerId = setTimeout(step, 8);
                this.animationTimers.set(win, timerId);
            } else {
                win.setBounds(finalTargetBounds);
                this.animationTimers.delete(win);
                
                if (this.animationTimers.size === 0) {
                    this.isAnimating = false;
                }
                
                if (options.onComplete) options.onComplete();
            }
        };
        step();
    }
    
    animateWindowPosition(win: BrowserWindow, targetPosition: { x?: number, y?: number }, options: { duration?: number, onComplete?: () => void } = {}) {
        if (!this._isWindowValid(win)) {
            if (options.onComplete) options.onComplete();
            return;
        }
        const currentBounds = win.getBounds();
        const targetBounds = { ...currentBounds, ...targetPosition };
        this.animateWindowBounds(win, targetBounds, options);
    }
    
    animateLayout(layout: Record<string, Partial<Rectangle>>, animated = true) {
        if (!layout) return;
        for (const winName in layout) {
            const win = this.windowPool.get(winName);
            const targetBounds = layout[winName];
            if (win && !win.isDestroyed() && targetBounds) {
                if (animated) {
                    this.animateWindowBounds(win, targetBounds);
                } else {
                    win.setBounds({ ...win.getBounds(), ...targetBounds });
                }
            }
        }
    }

    destroy() {
        this.animationTimers.forEach(timer => clearTimeout(timer));
        this.animationTimers.clear();
        this.isAnimating = false;
        console.log('[Movement] Manager destroyed');
    }
}

export default SmoothMovementManager;