// TOTP Generator 官网主要交互脚本

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 主初始化函数
function initializeApp() {
    initFAQ();
    initSmoothScroll();
    initDownloadButtons();
    initAnimations();
    initProgressAnimation();
    initMobileMenu();
    initAccessibility();
}

// FAQ 折叠展开功能
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // 关闭其他已打开的FAQ项
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // 切换当前FAQ项的状态
            item.classList.toggle('active');
            
            // 更新ARIA属性
            const isExpanded = item.classList.contains('active');
            question.setAttribute('aria-expanded', isExpanded);
            
            // 添加点击统计
            trackEvent('FAQ', 'toggle', question.querySelector('h3').textContent);
        });
        
        // 键盘支持
        question.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
    });
}

// 平滑滚动功能
function initSmoothScroll() {
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // 如果是锚点链接
            if (href.startsWith('#') && href.length > 1) {
                e.preventDefault();
                
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const headerOffset = 80; // 导航栏高度偏移
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // 添加焦点到目标元素（无障碍访问）
                    targetElement.setAttribute('tabindex', '-1');
                    targetElement.focus();
                    
                    // 跟踪滚动事件
                    trackEvent('Navigation', 'scroll_to', targetId);
                }
            }
        });
    });
}

// 下载按钮功能
function initDownloadButtons() {
    const downloadButtons = document.querySelectorAll('#download-btn, #main-download-btn, #footer-download-btn');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // 跟踪下载点击
            const buttonId = this.id || 'unknown';
            trackEvent('Download', 'click', buttonId);
            
            // 显示下载提示（不阻止默认行为，让链接正常跳转）
            showDownloadToast();
        });
    });
}

// 显示下载提示Toast
function showDownloadToast() {
    // 创建Toast提示
    const toast = document.createElement('div');
    toast.className = 'download-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7,10 12,15 17,10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>正在跳转到Chrome Web Store...</span>
        </div>
    `;
    
    // 添加Toast样式
    const toastStyles = `
        .download-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
            max-width: 300px;
        }
        .toast-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .toast-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
        }
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes fadeOut {
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    
    // 添加样式到页面
    if (!document.querySelector('#toast-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'toast-styles';
        styleSheet.textContent = toastStyles;
        document.head.appendChild(styleSheet);
    }
    
    // 添加Toast到页面
    document.body.appendChild(toast);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// 显示下载模态框（保留原函数以防其他地方调用）
function showDownloadModal() {
    // 创建模态框元素
    const modal = document.createElement('div');
    modal.className = 'download-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>正在跳转到Chrome Web Store</h3>
                <button class="modal-close" aria-label="关闭">&times;</button>
            </div>
            <div class="modal-body">
                <div class="loading-spinner"></div>
                <p>即将为您打开Chrome扩展商店...</p>
                <p class="modal-note">如果没有自动跳转，请手动访问Chrome Web Store搜索"TOTP Generator"</p>
            </div>
        </div>
    `;
    
    // 添加模态框样式
    const modalStyles = `
        .download-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        }
        .modal-header {
            padding: 20px 20px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
            color: #2d3748;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-body {
            padding: 20px;
            text-align: center;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        .modal-note {
            font-size: 0.9rem;
            color: #64748b;
            margin-top: 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    // 添加样式到页面
    if (!document.querySelector('#modal-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'modal-styles';
        styleSheet.textContent = modalStyles;
        document.head.appendChild(styleSheet);
    }
    
    // 添加模态框到页面
    document.body.appendChild(modal);
    
    // 关闭模态框功能
    const closeModal = () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };
    
    // 绑定关闭事件
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    // 3秒后自动关闭
    setTimeout(closeModal, 3000);
}

// 滚动动画
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // 观察需要动画的元素
    const animateElements = document.querySelectorAll('.feature-card, .security-item, .step, .faq-item');
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

// 进度环动画
function initProgressAnimation() {
    const progressCircles = document.querySelectorAll('.progress-circle circle');
    
    progressCircles.forEach((circle, index) => {
        // 为每个进度环设置不同的动画延迟
        circle.style.animationDelay = `${index * 2}s`;
        
        // 随机化进度值
        const randomProgress = Math.floor(Math.random() * 25) + 5; // 5-30秒
        const progressText = circle.parentElement.querySelector('.progress-text');
        if (progressText) {
            progressText.textContent = randomProgress;
        }
    });
}

// 移动端菜单（如果需要导航栏）
function initMobileMenu() {
    // 预留移动端导航功能
    const mobileBreakpoint = 768;
    
    function handleResize() {
        const isMobile = window.innerWidth < mobileBreakpoint;
        document.body.classList.toggle('mobile-view', isMobile);
    }
    
    window.addEventListener('resize', handleResize);
    handleResize(); // 初始检查
}

// 无障碍访问功能
function initAccessibility() {
    // 跳转到主内容的链接
    const skipLink = document.createElement('a');
    skipLink.href = '#features';
    skipLink.textContent = '跳转到主要内容';
    skipLink.className = 'skip-link sr-only';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 6px;
        background: #667eea;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1001;
        transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', function() {
        this.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', function() {
        this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // 为交互元素添加适当的ARIA属性
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach((question, index) => {
        question.setAttribute('role', 'button');
        question.setAttribute('aria-expanded', 'false');
        question.setAttribute('aria-controls', `faq-answer-${index}`);
        question.setAttribute('tabindex', '0');
        
        const answer = question.nextElementSibling;
        if (answer) {
            answer.setAttribute('id', `faq-answer-${index}`);
            answer.setAttribute('role', 'region');
        }
    });
}

// 事件跟踪函数
function trackEvent(category, action, label) {
    // 这里可以集成Google Analytics或其他分析工具
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: category,
            event_label: label
        });
    }
    
    // 控制台日志（开发时使用）
    console.log(`Event tracked: ${category} - ${action} - ${label}`);
}

// 性能监控
function initPerformanceMonitoring() {
    // 页面加载性能
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.timing;
            const loadTime = perfData.loadEventEnd - perfData.navigationStart;
            trackEvent('Performance', 'page_load_time', Math.round(loadTime));
        }, 0);
    });
    
    // 监控长任务
    if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 50) {
                    trackEvent('Performance', 'long_task', Math.round(entry.duration));
                }
            });
        });
        
        observer.observe({ entryTypes: ['longtask'] });
    }
}

// 错误处理
window.addEventListener('error', function(e) {
    trackEvent('Error', 'javascript_error', `${e.filename}:${e.lineno} - ${e.message}`);
});

// 未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(e) {
    trackEvent('Error', 'unhandled_promise_rejection', e.reason);
});

// 导出主要函数（如果需要在其他脚本中使用）
window.TOTPGenerator = {
    trackEvent,
    showDownloadModal
};

// 初始化性能监控
initPerformanceMonitoring();