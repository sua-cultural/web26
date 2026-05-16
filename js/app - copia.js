/* ============================================
   APP.JS - LÓGICA DE INTERACTIVIDAD
   ============================================
   
   - Timeline sincronizado con scroll
   - Menú hamburguesa (sol botón)
   - Swipe en móvil
   - Rueda del mouse en escritorio
   - Snap automático a secciones
   - NUEVO: Manejo de botón atrás (Android/iOS)
   - NUEVO: Swipe back (gesto desde borde izquierdo)
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
    
    // Stack de modals abiertos (para cerrar en orden LIFO)
    this.modalStack = [];
    
    // Detectar dispositivo
    this.isMobile = this.detectMobile();
    this.isTouch = this.detectTouchCapability();
    
    // Flag para history API
    this.historyHandled = false;
    
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
    
    // Event listeners - Botón Home
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
      homeButton.addEventListener('click', () => this.goToSection(0));
    }
    
    // Event listeners - Input
    if (this.isMobile || this.isTouch) {
      this.setupTouchHandling();
    } else {
      this.setupMouseWheelHandling();
    }

    // Event listeners - Arrow
    const arrowButton = document.getElementById('arrowButton');
    if (arrowButton) {
      arrowButton.addEventListener('click', () => this.goToSection(1));
    }
    
    // Modales
    this.setupModals();
    
    // Teclado
    this.setupKeyboardHandling();
    
    // 🆕 MANEJO DE BOTÓN ATRÁS (Android/iOS)
    this.setupBackButtonHandling();
    
    // 🆕 SWIPE BACK (desliz desde borde izquierdo)
    this.setupSwipeBackHandling();
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
    
    // Mostrar/ocultar botón Home (visible en secciones 2-5, oculto en 1)
    const homeButton = document.getElementById('homeButton');
    if (homeButton) {
      if (activeIndex === 0) {
        homeButton.classList.remove('visible');
      } else {
        homeButton.classList.add('visible');
      }
    }
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
     MODALES - GENÉRICO PARA TODOS
     ============================================ */

  setupModals() {
    // 1. Botones que abren modales inline (con data-modal)
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        const modal = document.getElementById(modalId);
        if (modal) {
          this.openModal(modal);
        }
      });
    });

    // 2. Botones que abren modales externos (con data-modal-external)
    document.querySelectorAll('[data-modal-external]').forEach(btn => {
      btn.addEventListener('click', () => {
        const htmlFile = btn.dataset.modalExternal;
        this.loadExternalModal(htmlFile);
      });
    });

    // 3. Todos los botones .modal-close cierran su modal
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
          this.closeModalElement(modal);
        }
      }
    });

    // 4. Click fuera del modal (en el fondo gris) cierra
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') && e.target === e.currentTarget) {
        this.closeModalElement(e.target);
      }
    });

    // 5. Botones que cierran modal y navegan (data-modal-close-go)
    document.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-modal-close-go')) {
        const sectionIndex = parseInt(e.target.dataset.modalCloseGo);
        const modal = e.target.closest('.modal');
        if (modal) {
          this.closeModalElement(modal);
          setTimeout(() => this.goToSection(sectionIndex), 300);
        }
      }
    });

    // 6. 🆕 Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModal = this.getLastOpenModal();
        if (openModal) {
          this.closeModalElement(openModal);
        }
      }
    });
  }

  openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // 🆕 Agregar modal al stack
    if (!this.modalStack.includes(modal)) {
      this.modalStack.push(modal);
    }
    
    // 🆕 Empujar estado al history para interceptar botón atrás
    this.pushModalState();
  }

  closeModalElement(modal) {
    modal.classList.remove('open');
    
    // 🆕 Remover del stack
    const index = this.modalStack.indexOf(modal);
    if (index > -1) {
      this.modalStack.splice(index, 1);
    }
    
    // Restaurar overflow solo si no hay más modals
    if (this.modalStack.length === 0) {
      document.body.style.overflow = '';
    }
  }

  loadExternalModal(htmlFile) {
    fetch(htmlFile)
      .then(response => {
        if (!response.ok) throw new Error('No se pudo cargar el modal');
        return response.text();
      })
      .then(html => {
        // Crear contenedor temporal si no existe
        let container = document.getElementById('externalModalContainer');
        if (!container) {
          container = document.createElement('div');
          container.id = 'externalModalContainer';
          document.body.appendChild(container);
        }
        
        container.innerHTML = html;
        const modal = container.querySelector('.modal');
        if (modal) {
          this.openModal(modal);
          // Re-setup event listeners para el nuevo modal
          this.setupModals();
        }
      })
      .catch(error => console.error('Error cargando modal externo:', error));
  }

  // 🆕 Obtener el último modal abierto
  getLastOpenModal() {
    return this.modalStack[this.modalStack.length - 1] || null;
  }

  /* ============================================
     🆕 BOTÓN ATRÁS (Android/iOS)
     ============================================ */

  setupBackButtonHandling() {
    // Escuchar el evento popstate (cuando el usuario presiona atrás)
    window.addEventListener('popstate', (e) => {
      const openModal = this.getLastOpenModal();
      
      if (openModal && openModal.classList.contains('open')) {
        // Si hay modal abierto, cerrar el modal en lugar de navegar
        this.closeModalElement(openModal);
        e.preventDefault();
      }
    });
  }

  // 🆕 Empujar estado al history
  pushModalState() {
    // Agregar un estado al history para cada modal abierto
    // Esto permite interceptar el botón atrás
    if (!this.historyHandled) {
      window.history.pushState({ modalOpen: true }, null);
      this.historyHandled = true;
    }
  }

  /* ============================================
     🆕 SWIPE BACK (desliz desde borde izquierdo)
     ============================================ */

  setupSwipeBackHandling() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwipeBackGesture = false;
    const SWIPE_BACK_THRESHOLD = 50; // pixels desde el borde
    const SWIPE_BACK_VELOCITY = 0.5; // velocidad mínima
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      // Detectar si el toque comienza desde el borde izquierdo (primeros 20px)
      isSwipeBackGesture = touchStartX < SWIPE_BACK_THRESHOLD;
    }, false);
    
    document.addEventListener('touchmove', (e) => {
      if (!isSwipeBackGesture) return;
      
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartX;
      const diffY = Math.abs(currentY - touchStartY);
      
      // Si movimiento vertical es mayor que horizontal, no es swipe back
      if (diffY > Math.abs(diffX)) {
        isSwipeBackGesture = false;
        return;
      }
      
      // Si hay modal abierto y el swipe va hacia la derecha, mostrar visual feedback
      const openModal = this.getLastOpenModal();
      if (openModal && diffX > 10) {
        // Aplicar transformación visual mientras se desliza
        openModal.style.transform = `translateX(${Math.min(diffX, 100)}px)`;
        openModal.style.opacity = 1 - (diffX / 300);
      }
    }, false);
    
    document.addEventListener('touchend', (e) => {
      if (!isSwipeBackGesture) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;
      
      const openModal = this.getLastOpenModal();
      if (openModal) {
        // Resetear transform
        openModal.style.transform = '';
        openModal.style.opacity = '';
        
        // Si deslizó más de 100px hacia la derecha, cerrar modal
        if (diffX > 100) {
          this.closeModalElement(openModal);
          console.log('📱 Modal cerrado por swipe back');
        }
      }
      
      isSwipeBackGesture = false;
    }, false);
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
      // Solo detectar swipe si no es desde el borde izquierdo
      if (e.touches[0].clientX >= 50) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }
    }, false);
    
    this.scrollContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      // Solo procesar si no es un swipe back
      if (touchStartX >= 50) {
        this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
      }
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
