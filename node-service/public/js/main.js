document.addEventListener("DOMContentLoaded", () => {
    // Theme toggle functionality
    const themeToggle = document.getElementById("theme-toggle")
  
    themeToggle.addEventListener("click", () => {
      const isDark = document.documentElement.classList.toggle("dark")
      localStorage.setItem("theme", isDark ? "dark" : "light")
    })
  
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle")
    const mobileMenu = document.getElementById("mobile-menu")
  
    mobileMenuToggle.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden")
    })
  
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
  
        const targetId = this.getAttribute("href")
        if (targetId === "#") return
  
        const targetElement = document.querySelector(targetId)
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
  
          // Close mobile menu if open
          if (!mobileMenu.classList.contains("hidden")) {
            mobileMenu.classList.add("hidden")
          }
        }
      })
    })
  
    // Scroll reveal animations
    const revealElements = document.querySelectorAll(".reveal")
  
    const revealOnScroll = () => {
      const windowHeight = window.innerHeight
      const revealPoint = 150
  
      revealElements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top
  
        if (elementTop < windowHeight - revealPoint) {
          element.classList.add("active")
        }
      })
    }
  
    // Run on load
    revealOnScroll()
  
    // Run on scroll
    window.addEventListener("scroll", revealOnScroll)
  
    // Add hover effects to links
    const links = document.querySelectorAll("a[href]:not(.nav-link)")
  
    links.forEach((link) => {
      link.addEventListener("mouseenter", () => {
        link.classList.add("animate-shimmer")
      })
  
      link.addEventListener("mouseleave", () => {
        link.classList.remove("animate-shimmer")
      })
    })
  
    // Add subtle parallax effect to hero section
    const heroSection = document.querySelector(".hero-pattern")
  
    if (heroSection) {
      window.addEventListener("scroll", () => {
        const scrollPosition = window.scrollY
        if (scrollPosition < 600) {
          heroSection.style.backgroundPositionY = `${scrollPosition * 0.2}px`
        }
      })
    }
  
    // Add floating animation to decorative elements
    const addFloatingAnimation = () => {
      const elements = document.querySelectorAll(".vietnam-text-wrapper, .decorative-circles")
  
      elements.forEach((element) => {
        const randomDelay = Math.random() * 2
        element.style.animationDelay = `${randomDelay}s`
      })
    }
  
    addFloatingAnimation()
  })
  