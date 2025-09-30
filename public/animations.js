class GameAnimations {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.confettiParticles = [];
        this.skeletonParticles = [];
        this.animationId = null;
    }

    init() {
        this.createCanvas();
    }

    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    showConfetti() {
        this.clearCanvas();
        this.createConfettiParticles();
        this.animateConfetti();
    }

    createConfettiParticles() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
        
        for (let i = 0; i < 150; i++) {
            this.confettiParticles.push({
                x: Math.random() * this.canvas.width,
                y: -10,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                shape: Math.random() > 0.5 ? 'circle' : 'square'
            });
        }
    }

    animateConfetti() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.confettiParticles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            particle.vy += 0.1;

            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            this.ctx.fillStyle = particle.color;
            
            if (particle.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            }
            
            this.ctx.restore();

            if (particle.y > this.canvas.height + 20) {
                this.confettiParticles.splice(index, 1);
            }
        });

        if (this.confettiParticles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animateConfetti());
        } else {
            setTimeout(() => this.clearCanvas(), 2000);
        }
    }

    showSkeleton() {
        this.clearCanvas();
        this.createSkeletonParticles();
        this.animateSkeleton();
    }

    createSkeletonParticles() {
        for (let i = 0; i < 50; i++) {
            this.skeletonParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 15 + 10,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 5,
                opacity: Math.random() * 0.8 + 0.2,
                life: 1.0,
                decay: Math.random() * 0.02 + 0.01
            });
        }
    }

    animateSkeleton() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.skeletonParticles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            particle.life -= particle.decay;
            particle.opacity = particle.life;

            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = '#666666';
            
            this.drawSkeletonBone(particle.size);
            this.ctx.restore();

            if (particle.life <= 0) {
                this.skeletonParticles.splice(index, 1);
            }
        });

        if (this.skeletonParticles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animateSkeleton());
        } else {
            setTimeout(() => this.clearCanvas(), 1000);
        }
    }

    drawSkeletonBone(size) {
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(-size/2, -size/4, size, size/2);
        
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(-size/2, -size/8, size, size/4);
        
        this.ctx.fillStyle = '#888888';
        this.ctx.beginPath();
        this.ctx.arc(-size/2, 0, size/8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(size/2, 0, size/8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    showDraw() {
        this.clearCanvas();
        this.createDrawParticles();
        this.animateDraw();
    }

    createDrawParticles() {
        for (let i = 0; i < 100; i++) {
            this.confettiParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: '#f59e0b',
                size: Math.random() * 6 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 5,
                shape: 'circle',
                life: 1.0,
                decay: Math.random() * 0.01 + 0.005
            });
        }
    }

    animateDraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.confettiParticles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.rotation += particle.rotationSpeed;
            particle.life -= particle.decay;
            particle.opacity = particle.life;

            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.fillStyle = particle.color;
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();

            if (particle.life <= 0) {
                this.confettiParticles.splice(index, 1);
            }
        });

        if (this.confettiParticles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animateDraw());
        } else {
            setTimeout(() => this.clearCanvas(), 1500);
        }
    }

    clearCanvas() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.confettiParticles = [];
        this.skeletonParticles = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    destroy() {
        this.clearCanvas();
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

const gameAnimations = new GameAnimations();
