/* ============================================
   APP.JS - LÓGICA DE INTERACTIVIDAD
   ============================================
   
   - Timeline sincronizado con scroll
   - Menú hamburguesa (sol botón)
   - Swipe en móvil
   - Rueda del mouse en escritorio
   - Snap automático a secciones
*/

class SuaWebApp {
  constructor() {
    // DOM Elements
    this.scrollContainer = document.getElementById('scrollContainer');
    this.timelinePoints = document.querySelectorAll('.timeline-point');
    this.sunButton = document.getElementById('sunButton');
    this.submenu = document.getElementById('submenu');
    this.menuOverlay = document.getElementById('menuOverlay');
    
    // Estado
    this.currentSection = 0;
    this.totalSections = 5;
    this.isScrolling = false;
    this.scrollTimeout = null;
    
    // Detectar dispositivo
    this.isMobile = this.detectMobile();
    this.isTouch = this.detectTouchCapability();
    
    // Inicializar
    this.init();
  }

  init() {
    console.log('🌞 Sua Web App iniciado');
    
    // Event listeners - Scroll
    this.scrollContainer.addEventListener('scroll', (e) => this.handleScroll(e));
    
    // Event listeners - Menú
    this.sunButton.addEventListener('click', () => this.toggleSubmenu());
    this.menuOverlay.addEventListener('click', () => this.closeSubmenu());
    document.querySelectorAll('.submenu-item').forEach(item => {
      item.addEventListener('click', () => this.closeSubmenu());
    });
    
    // Event listeners - Timeline
    this.timelinePoints.forEach(point => {
      point.addEventListener('click', (e) => this.handleTimelineClick(e));
    });
    
    // Event listeners - Input
    if (this.isMobile || this.isTouch) {
      this.setupTouchHandling();
    } else {
      this.setupMouseWheelHandling();
    }
    
    // Opcional: Detectar teclas
    this.setupKeyboardHandling();
  }

  /* ============================================
     SCROLL Y SNAP
     ============================================ */

  handleScroll(event) {
    // Actualizar timeline
    this.updateTimelineIndicator();
    
    // Detectar fin de scroll para snap
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.snapToSection();
    }, 150); // Esperar 150ms después de que pare de scrollear
  }

  updateTimelineIndicator() {
    const scrollPos = this.scrollContainer.scrollLeft;
    const sectionWidth = this.scrollContainer.offsetWidth;
    const activeIndex = Math.round(scrollPos / sectionWidth);
    
    // Actualizar estado
    this.currentSection = activeIndex;
    
    // Actualizar visual del timeline
    this.timelinePoints.forEach((point, idx) => {
      point.classList.toggle('active', idx === activeIndex);
    });
  }

  snapToSection() {
    const scrollPos = this.scrollContainer.scrollLeft;
    const sectionWidth = this.scrollContainer.offsetWidth;
    const targetIndex = Math.round(scrollPos / sectionWidth);
    
    const targetScroll = targetIndex * sectionWidth;
    
    if (Math.abs(scrollPos - targetScroll) > 1) {
      this.scrollContainer.scrollTo({
        left: targetScroll,
        behavior: 'smooth'
      });
    }
  }

  /* ============================================
     MENÚ (SOL BOTÓN)
     ============================================ */

  toggleSubmenu() {
    const isOpen = this.submenu.classList.contains('open');
    
    if (isOpen) {
      this.closeSubmenu();
    } else {
      this.openSubmenu();
    }
  }

  openSubmenu() {
    this.submenu.classList.add('open');
    this.menuOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  closeSubmenu() {
    this.submenu.classList.remove('open');
    this.menuOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ============================================
     TIMELINE CLICKS
     ============================================ */

  handleTimelineClick(event) {
    const point = event.currentTarget;
    const index = parseInt(point.dataset.index);
    
    this.goToSection(index);
  }

  goToSection(index) {
    if (index < 0 || index >= this.totalSections) return;
    
    const sectionWidth = this.scrollContainer.offsetWidth;
    const targetScroll = index * sectionWidth;
    
    this.scrollContainer.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
    
    this.currentSection = index;
  }

  /* ============================================
     SWIPE / TOUCH (MÓVIL)
     ============================================ */

  setupTouchHandling() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    this.scrollContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, false);
    
    this.scrollContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, false);
  }

  handleSwipe(startX, startY, endX, endY) {
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    // Solo considerar swipe horizontal si el movimiento horizontal es mayor que el vertical
    if (Math.abs(diffX) > Math.abs(diffY)) {
      const threshold = 50; // pixels mínimos para considerar swipe
      
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          // Swipe izquierda = siguiente sección
          this.goToSection(this.currentSection + 1);
        } else {
          // Swipe derecha = sección anterior
          this.goToSection(this.currentSection - 1);
        }
      }
    }
  }

  /* ============================================
     RUEDA DEL MOUSE (ESCRITORIO)
     ============================================ */

  setupMouseWheelHandling() {
    let lastWheelTime = 0;
    const wheelThrottle = 800; // ms entre cambios de sección
    
    this.scrollContainer.addEventListener('wheel', (e) => {
      const now = Date.now();
      
      // Throttle: no permitir cambios muy rápido
      if (now - lastWheelTime < wheelThrottle) {
        return;
      }
      
      // Solo en escritorio (no en móvil con rueda simulada)
      if (this.isMobile) return;
      
      e.preventDefault();
      
      if (e.deltaY > 0) {
        // Scroll abajo = siguiente sección
        this.goToSection(this.currentSection + 1);
      } else if (e.deltaY < 0) {
        // Scroll arriba = sección anterior
        this.goToSection(this.currentSection - 1);
      }
      
      lastWheelTime = now;
    }, { passive: false });
  }

  /* ============================================
     KEYBOARD (BONUS)
     ============================================ */

  setupKeyboardHandling() {
    let lastKeyTime = 0;
    const keyThrottle = 400; // ms entre cambios
    
    document.addEventListener('keydown', (e) => {
      const now = Date.now();
      
      if (now - lastKeyTime < keyThrottle) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.goToSection(this.currentSection + 1);
        lastKeyTime = now;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.goToSection(this.currentSection - 1);
        lastKeyTime = now;
      }
    });
  }

  /* ============================================
     UTILIDADES - DETECCIÓN DE DISPOSITIVO
     ============================================ */

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  detectTouchCapability() {
    return (
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0)
    );
  }
}

/* ============================================
   INICIAR LA APP CUANDO EL DOM ESTÉ LISTO
   ============================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SuaWebApp();
  });
} else {
  new SuaWebApp();
}
