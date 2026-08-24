document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("menuBtn");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuIcon = document.getElementById("menuIcon");

    // 1. Mobile Menu Logic
    menuBtn.addEventListener("click", () => {
        const isHidden = mobileMenu.classList.contains("hidden");
        if (isHidden) {
            mobileMenu.classList.remove("hidden");
            menuIcon.setAttribute("d", "M6 18L18 6M6 6l12 12");
        } else {
            mobileMenu.classList.add("hidden");
            menuIcon.setAttribute("d", "M4 6h16M4 12h16M4 18h16");
        }
    });

    // 2. Smooth Scroll Logic for "data-target" buttons
    const navLinks = document.querySelectorAll(".nav-link");

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const targetSelector = link.getAttribute("data-target");
            const targetElement = document.querySelector(targetSelector);

            if (targetElement) {
                // Close mobile menu if it was open
                mobileMenu.classList.add("hidden");
                menuIcon.setAttribute("d", "M4 6h16M4 12h16M4 18h16");

                // Perform Smooth Scroll
                const navHeight = 80; // height of our fixed nav
                const elementPosition =
                    targetElement.getBoundingClientRect().top;
                const offsetPosition =
                    elementPosition + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth",
                });
            }
        });
    });

    // 3. Dynamic Glow Interaction
    // Let's make the background bars react slightly to mouse movements
    document.addEventListener("mousemove", (e) => {
        const bars = document.querySelectorAll(".vocal-bar");
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        bars.forEach((bar, index) => {
            const shift = (index + 1) * 10;
            bar.style.transform = `translate(${mouseX * shift}px, ${mouseY * shift}px) scaleY(${1 + mouseY * 0.2})`;
        });
    });
});
